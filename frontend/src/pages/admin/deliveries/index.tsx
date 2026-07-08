import "./styles.css";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Loader2, MapPinned, Plus, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useTenant } from "../../../app/providers/tenant-provider";
import { useBodyScrollLock } from "../../../hooks/use-body-scroll-lock";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { branchesService } from "../../../services/branches";
import { deliveryZonesService, DeliveryZonePayload } from "../../../services/delivery-zones";
import { DeliveryZone } from "../../../types/database";
import { formatCurrency } from "../../../utils/format";
import { formatCep, onlyDigits } from "../../../utils/input-masks";
import { parseMoneyInput } from "../../../utils/money";

type ZoneForm = {
  branchId: string;
  name: string;
  type: "NEIGHBORHOOD" | "POSTAL_CODE" | "RADIUS" | "RADIUS_OVERFLOW";
  neighborhood: string;
  postalCodeStart: string;
  postalCodeEnd: string;
  radiusKm: string;
  distanceMode: "ROUTE" | "STRAIGHT_LINE";
  fee: string;
  minimumOrderValue: string;
  estimatedMinutes: string;
  status: "ACTIVE" | "INACTIVE";
};

type GeoPoint = { lat: number; lng: number };
type MapSize = { width: number; height: number };

const mapGeocodeCache = new Map<string, GeoPoint | null>();
const EARTH_RADIUS_METERS = 6378137;
const MAP_RADIUS_PADDING = 1.72;
const MIN_SMALL_RADIUS_CONTEXT_METERS = 180;
const SMALL_RADIUS_ZOOM_LIMIT_METERS = 1000;
const DEFAULT_MAP_SIZE: MapSize = { width: 360, height: 280 };

const emptyZoneForm: ZoneForm = {
  branchId: "",
  name: "",
  type: "NEIGHBORHOOD",
  neighborhood: "",
  postalCodeStart: "",
  postalCodeEnd: "",
  radiusKm: "5,0",
  distanceMode: "ROUTE",
  fee: "R$ 8,00",
  minimumOrderValue: "R$ 0,00",
  estimatedMinutes: "35",
  status: "ACTIVE"
};

function parseDecimalInput(value: string) {
  const normalized = value.replace(/[^\d,.]/g, "").replace(",", ".");
  return Number(normalized || 0);
}

function formatKmInput(value: string | number | undefined) {
  if (value === undefined || value === "") return "";

  const parsed = typeof value === "number" ? value : parseDecimalInput(value);
  if (!Number.isFinite(parsed)) return "";

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2
  }).format(parsed);
}

function formatKmMask(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";

  const parsed = Number(digits) / 10;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(parsed);
}

function formatMoneyMask(value: string) {
  const hasDigits = Boolean(value.replace(/\D/g, ""));
  return hasDigits ? formatCurrency(parseMoneyInput(value)) : "";
}

function formatDistanceLabel(radiusKm: number) {
  if (radiusKm > 0 && radiusKm < 1) {
    return `${Math.round(radiusKm * 1000)} m`;
  }

  return `${formatKmInput(radiusKm)} km`;
}

function distanceModeLabel(mode: "ROUTE" | "STRAIGHT_LINE" | undefined) {
  return mode === "STRAIGHT_LINE" ? "linha reta" : "trajeto";
}

function normalizeMapQuery(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function branchAddressQuery(address: { street?: string; number?: string; district?: string; city?: string; state?: string; postalCode?: string }) {
  return [address.street, address.number, address.district, address.city, address.state, address.postalCode, "Brasil"].filter(Boolean).join(", ");
}

async function geocodeMapAddress(query: string, signal?: AbortSignal) {
  const normalized = normalizeMapQuery(query);
  const cached = mapGeocodeCache.get(normalized);

  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "br"
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    mapGeocodeCache.set(normalized, null);
    return null;
  }

  const [result] = (await response.json()) as Array<{ lat: string; lon: string }>;
  const point = result ? { lat: Number(result.lat), lng: Number(result.lon) } : null;
  mapGeocodeCache.set(normalized, point);
  return point;
}

function clampLatitude(latitude: number) {
  return Math.min(85.05112878, Math.max(-85.05112878, latitude));
}

function lonLatToMercator(point: GeoPoint) {
  const lat = clampLatitude(point.lat);

  return {
    x: EARTH_RADIUS_METERS * (point.lng * Math.PI / 180),
    y: EARTH_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))
  };
}

function mercatorToLonLat(x: number, y: number): GeoPoint {
  return {
    lat: (2 * Math.atan(Math.exp(y / EARTH_RADIUS_METERS)) - Math.PI / 2) * 180 / Math.PI,
    lng: x / EARTH_RADIUS_METERS * 180 / Math.PI
  };
}

function getVisibleRadiusMeters(radiusMeters: number) {
  if (radiusMeters <= 0) return SMALL_RADIUS_ZOOM_LIMIT_METERS;

  if (radiusMeters < SMALL_RADIUS_ZOOM_LIMIT_METERS) {
    return Math.max(radiusMeters * 1.85, MIN_SMALL_RADIUS_CONTEXT_METERS);
  }

  return radiusMeters;
}

function buildOsmRadiusMap(point: GeoPoint, radiusKm: number, size: MapSize) {
  const width = Math.max(size.width, 260);
  const height = Math.max(size.height, 220);
  const radiusMeters = Math.max(Number.isFinite(radiusKm) ? radiusKm * 1000 : 0, 0);
  const visibleRadiusMeters = getVisibleRadiusMeters(radiusMeters);
  const mercatorScale = 1 / Math.max(Math.cos((point.lat * Math.PI) / 180), 0.25);
  const contextRadiusPixels = Math.min(width, height) / (MAP_RADIUS_PADDING * 2);
  const metersPerPixel = (visibleRadiusMeters * mercatorScale) / contextRadiusPixels;
  const radiusPixels = (radiusMeters * mercatorScale) / metersPerPixel;
  const halfWidthMeters = (width * metersPerPixel) / 2;
  const halfHeightMeters = (height * metersPerPixel) / 2;
  const center = lonLatToMercator(point);
  const southwest = mercatorToLonLat(center.x - halfWidthMeters, center.y - halfHeightMeters);
  const northeast = mercatorToLonLat(center.x + halfWidthMeters, center.y + halfHeightMeters);
  const bbox = [southwest.lng, southwest.lat, northeast.lng, northeast.lat].join(",");

  return {
    radiusDiameter: `${Math.round(radiusPixels * 2)}px`,
    url: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`
  };
}

function StaticRadiusMap({ point, radiusKm, showRadius }: { point: GeoPoint; radiusKm: number; showRadius: boolean }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<MapSize>(DEFAULT_MAP_SIZE);
  const radiusMap = buildOsmRadiusMap(point, radiusKm, size);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width || DEFAULT_MAP_SIZE.width, height: rect.height || DEFAULT_MAP_SIZE.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="static-radius-map" ref={mapRef}>
      <iframe aria-hidden="true" src={radiusMap.url} tabIndex={-1} title="Mapa da area de entrega" />
      {showRadius ? (
        <span className="real-map-radius" style={{ "--radius-diameter": radiusMap.radiusDiameter } as CSSProperties} aria-hidden="true" />
      ) : null}
      <span className="real-map-branch-point" aria-hidden="true" />
    </div>
  );
}

export function AdminDeliveries() {
  const { tenant, settings } = useTenant();
  const queryClient = useQueryClient();
  const { data: branches = [] } = useQuery({ queryKey: ["branches", tenant.id], queryFn: branchesService.list });
  const { data: deliveryZones = [] } = useQuery({ queryKey: ["delivery-zones", tenant.id], queryFn: deliveryZonesService.list });
  const [zoneForm, setZoneForm] = useState<ZoneForm>(emptyZoneForm);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zonePendingDelete, setZonePendingDelete] = useState<DeliveryZone | null>(null);
  useBodyScrollLock(Boolean(editingZone));

  const saveZoneMutation = useMutation({
    mutationFn: (payload: DeliveryZonePayload) =>
      editingZone ? deliveryZonesService.update(editingZone.id, payload) : deliveryZonesService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-zones", tenant.id] });
      setZoneForm((current) => ({ ...emptyZoneForm, branchId: current.branchId }));
      setEditingZone(null);
      toast.success(editingZone ? "Area de entrega atualizada." : "Area de entrega criada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a area de entrega.")
  });
  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => deliveryZonesService.remove(zoneId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-zones", tenant.id] });
      setZonePendingDelete(null);
      toast.success("Area de entrega desativada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel desativar a area.")
  });

  useEffect(() => {
    const firstBranchId = branches[0]?.id;

    if (firstBranchId && !zoneForm.branchId) {
      setZoneForm((current) => ({ ...current, branchId: firstBranchId }));
    }
  }, [branches, zoneForm.branchId]);

  const handleZoneSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!zoneForm.branchId) {
      toast.warning("Cadastre ou selecione uma filial antes de criar a area.");
      return;
    }

    if (zoneForm.type === "NEIGHBORHOOD" && !zoneForm.neighborhood.trim()) {
      toast.warning("Informe o bairro atendido.");
      return;
    }

    if (zoneForm.type === "RADIUS" && parseDecimalInput(zoneForm.radiusKm || "0") <= 0) {
      toast.warning("Informe um trajeto maior que zero.");
      return;
    }

    await saveZoneMutation.mutateAsync({
      branchId: zoneForm.branchId,
      name: zoneForm.name || "Area padrao",
      type: zoneForm.type,
      neighborhood: zoneForm.type === "NEIGHBORHOOD" ? zoneForm.neighborhood.trim() : undefined,
      postalCodeStart: zoneForm.type === "POSTAL_CODE" ? onlyDigits(zoneForm.postalCodeStart) : undefined,
      postalCodeEnd: zoneForm.type === "POSTAL_CODE" ? onlyDigits(zoneForm.postalCodeEnd) : undefined,
      radiusKm: zoneForm.type === "RADIUS" ? parseDecimalInput(zoneForm.radiusKm || "0") : undefined,
      distanceMode: zoneForm.type === "RADIUS" || zoneForm.type === "RADIUS_OVERFLOW" ? zoneForm.distanceMode : "ROUTE",
      fee: parseMoneyInput(zoneForm.fee || "0"),
      minimumOrderValue: parseMoneyInput(zoneForm.minimumOrderValue || "0"),
      estimatedMinutes: zoneForm.estimatedMinutes ? Number(zoneForm.estimatedMinutes) : undefined,
      status: zoneForm.status
    });
  };

  const startEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZoneForm({
      branchId: zone.branchId,
      name: zone.name,
      type: zone.type,
      neighborhood: zone.neighborhood ?? "",
      postalCodeStart: formatCep(zone.postalCodeStart ?? ""),
      postalCodeEnd: formatCep(zone.postalCodeEnd ?? ""),
      radiusKm: formatKmInput(zone.radiusKm ?? 5),
      distanceMode: zone.distanceMode ?? "ROUTE",
      fee: formatCurrency(zone.fee),
      minimumOrderValue: formatCurrency(zone.minimumOrderValue),
      estimatedMinutes: String(zone.estimatedMinutes ?? 35),
      status: zone.status
    });
  };

  const closeZoneEditModal = () => {
    setEditingZone(null);
    setZoneForm((current) => ({ ...emptyZoneForm, branchId: current.branchId }));
  };

  const renderZoneFields = () => (
    <div className="form-grid two-columns">
      <label className="field">
        <span>Filial</span>
        <div>
          <select value={zoneForm.branchId} onChange={(event) => setZoneForm((current) => ({ ...current, branchId: event.target.value }))}>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </label>
      <label className="field">
        <span>Status</span>
        <div>
          <select value={zoneForm.status} onChange={(event) => setZoneForm((current) => ({ ...current, status: event.target.value as "ACTIVE" | "INACTIVE" }))}>
            <option value="ACTIVE">Ativa</option>
            <option value="INACTIVE">Inativa</option>
          </select>
        </div>
      </label>
      <label className="field">
        <span>Nome da area</span>
        <div>
          <input value={zoneForm.name} onChange={(event) => setZoneForm((current) => ({ ...current, name: event.target.value }))} placeholder="Centro ate 3km" />
        </div>
      </label>
      <label className="field">
        <span>Tipo de calculo</span>
        <div>
          <select value={zoneForm.type} onChange={(event) => setZoneForm((current) => ({ ...current, type: event.target.value as ZoneForm["type"] }))}>
            <option value="NEIGHBORHOOD">Bairro manual</option>
            <option value="RADIUS">Faixa por distancia</option>
            <option value="RADIUS_OVERFLOW">Acima da maior faixa</option>
            <option value="POSTAL_CODE">Faixa de CEP</option>
          </select>
        </div>
      </label>
      {zoneForm.type === "RADIUS" || zoneForm.type === "RADIUS_OVERFLOW" ? (
        <label className="field">
          <span>Modo da distancia</span>
          <div>
            <select
              value={zoneForm.distanceMode}
              onChange={(event) => setZoneForm((current) => ({ ...current, distanceMode: event.target.value as ZoneForm["distanceMode"] }))}
            >
              <option value="ROUTE">Trajeto do motoboy</option>
              <option value="STRAIGHT_LINE">Linha reta no mapa</option>
            </select>
          </div>
        </label>
      ) : null}
      {zoneForm.type === "NEIGHBORHOOD" ? (
        <label className="field">
          <span>Bairro atendido</span>
          <div>
            <input value={zoneForm.neighborhood} onChange={(event) => setZoneForm((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Ex: Centro" />
          </div>
        </label>
      ) : null}
      {zoneForm.type === "POSTAL_CODE" ? (
        <>
          <label className="field">
            <span>CEP inicial</span>
            <div>
              <input value={zoneForm.postalCodeStart} onChange={(event) => setZoneForm((current) => ({ ...current, postalCodeStart: formatCep(event.target.value) }))} placeholder="00000-000" />
            </div>
          </label>
          <label className="field">
            <span>CEP final</span>
            <div>
              <input value={zoneForm.postalCodeEnd} onChange={(event) => setZoneForm((current) => ({ ...current, postalCodeEnd: formatCep(event.target.value) }))} placeholder="99999-999" />
            </div>
          </label>
        </>
      ) : zoneForm.type === "RADIUS" ? (
        <label className="field">
          <span>Km maximo da faixa</span>
          <div>
            <input
              type="text"
              inputMode="numeric"
              value={zoneForm.radiusKm}
              onBlur={(event) => setZoneForm((current) => ({ ...current, radiusKm: formatKmInput(event.target.value) }))}
              onChange={(event) => setZoneForm((current) => ({ ...current, radiusKm: formatKmMask(event.target.value) }))}
              placeholder="0,0"
            />
          </div>
        </label>
      ) : zoneForm.type === "RADIUS_OVERFLOW" ? (
        <div className="field">
          <span>Regra da faixa</span>
          <small className="muted-text">Usada quando a distancia passar da maior faixa ativa cadastrada.</small>
        </div>
      ) : null}
      <label className="field">
        <span>Taxa</span>
        <div>
          <input
            type="text"
            inputMode="numeric"
            value={zoneForm.fee}
            onChange={(event) => setZoneForm((current) => ({ ...current, fee: formatMoneyMask(event.target.value) }))}
            placeholder="R$ 0,00"
          />
        </div>
      </label>
      <label className="field">
        <span>Pedido minimo</span>
        <div>
          <input
            type="text"
            inputMode="numeric"
            value={zoneForm.minimumOrderValue}
            onChange={(event) => setZoneForm((current) => ({ ...current, minimumOrderValue: formatMoneyMask(event.target.value) }))}
            placeholder="R$ 0,00"
          />
        </div>
      </label>
      <label className="field">
        <span>Tempo estimado</span>
        <div>
          <input min="1" type="number" value={zoneForm.estimatedMinutes} onChange={(event) => setZoneForm((current) => ({ ...current, estimatedMinutes: event.target.value }))} />
        </div>
      </label>
    </div>
  );

  const selectedBranch = branches.find((branch) => branch.id === zoneForm.branchId);
  const [mapPoint, setMapPoint] = useState<GeoPoint | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const radiusKm = zoneForm.type === "RADIUS" ? parseDecimalInput(zoneForm.radiusKm || "0") : 0;
  const mapQuery = selectedBranch?.address
    ? `${selectedBranch.address.street}, ${selectedBranch.address.number}, ${selectedBranch.address.district}, ${selectedBranch.address.city}, ${selectedBranch.address.state}`
    : `${settings.brandName}, ${tenant.slug}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  useEffect(() => {
    const address = selectedBranch?.address;

    if (!address) {
      setMapPoint(null);
      setIsMapLoading(false);
      return;
    }

    if (address.latitude !== undefined && address.longitude !== undefined && address.latitude !== null && address.longitude !== null) {
      setMapPoint({ lat: Number(address.latitude), lng: Number(address.longitude) });
      setIsMapLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsMapLoading(true);

    void geocodeMapAddress(branchAddressQuery(address), controller.signal)
      .then((point) => {
        if (!controller.signal.aborted) {
          setMapPoint(point);
        }
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setMapPoint(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsMapLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedBranch]);

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Logistica"
        title="Entregas"
        description="Configure taxas por bairro, trajeto ou linha reta e visualize a base de saida do motoboy."
      />

      <div className="deliveries-grid">
        <form className="panel delivery-zone-form" onSubmit={handleZoneSubmit}>
          <div className="delivery-heading">
            <div>
              <h2>Nova area</h2>
              <p className="muted-text">As areas ativas aparecem no checkout do cliente.</p>
            </div>
            <Bike size={20} />
          </div>

          {renderZoneFields()}

          <div className="delivery-form-actions">
            <button className="primary-button" disabled={saveZoneMutation.isPending} type="submit">
              {saveZoneMutation.isPending ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Criar area
            </button>
          </div>
        </form>

        <aside className="panel delivery-map-card">
          <div>
            <span className="eyebrow">Mapa do motoboy</span>
            <strong>{selectedBranch?.name ?? "Filial principal"}</strong>
            <p>{selectedBranch?.address ? `${selectedBranch.address.street}, ${selectedBranch.address.number} - ${selectedBranch.address.district}` : "Cadastre o endereco da filial para melhorar a rota."}</p>
          </div>
          <div className="delivery-map-preview real-map-preview">
            {mapPoint ? (
              <>
                <StaticRadiusMap point={mapPoint} radiusKm={radiusKm} showRadius={zoneForm.type === "RADIUS" && zoneForm.distanceMode === "STRAIGHT_LINE" && radiusKm > 0} />
                <span className="real-map-note">{zoneForm.distanceMode === "STRAIGHT_LINE" ? "Linha reta" : "Trajeto no checkout"}</span>
              </>
            ) : (
              <div className="map-empty-state">
                <MapPinned size={30} />
                <strong>{isMapLoading ? "Localizando filial..." : "Mapa indisponivel"}</strong>
                <span>Cadastre latitude e longitude na filial para melhorar a visualizacao.</span>
              </div>
            )}
            <div className="real-map-caption">
              {zoneForm.type === "RADIUS"
                ? `${formatDistanceLabel(radiusKm)} por ${distanceModeLabel(zoneForm.distanceMode)}`
                : zoneForm.type === "RADIUS_OVERFLOW"
                  ? `Taxa fora da maior faixa por ${distanceModeLabel(zoneForm.distanceMode)}`
                  : zoneForm.type === "NEIGHBORHOOD"
                    ? "Entrega por bairro"
                    : "Faixas de CEP ativas"}
            </div>
          </div>
          <a className="wide-link" href={mapUrl} rel="noreferrer" target="_blank">
            Abrir no mapa
          </a>
        </aside>

        <section className="panel delivery-zone-list-panel">
          <h2>Areas cadastradas</h2>
          <div className="delivery-zone-list">
            {deliveryZones.map((zone) => (
              <article className="delivery-zone-card" key={zone.id}>
                <div>
                  <strong>{zone.name}</strong>
                  <span>
                    {zone.type === "POSTAL_CODE"
                      ? `${formatCep(zone.postalCodeStart ?? "")} ate ${formatCep(zone.postalCodeEnd ?? "")}`
                      : zone.type === "NEIGHBORHOOD"
                        ? zone.neighborhood ?? "Bairro nao informado"
                        : zone.type === "RADIUS_OVERFLOW"
                          ? `Acima da maior faixa por ${distanceModeLabel(zone.distanceMode)}`
                          : `Ate ${zone.radiusKm ?? 0} km por ${distanceModeLabel(zone.distanceMode)}`}
                  </span>
                </div>
                <div>
                  <strong>{formatCurrency(zone.fee)}</strong>
                  <span>{zone.estimatedMinutes ?? "-"} min</span>
                </div>
                <StatusBadge status={zone.status} />
                <button onClick={() => startEditZone(zone)} type="button">Editar</button>
                <button className="danger-link-button" onClick={() => setZonePendingDelete(zone)} type="button">
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
            {deliveryZones.length === 0 ? <p className="muted-text">Nenhuma area cadastrada ainda.</p> : null}
          </div>
        </section>
      </div>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Desativar"
        description={`A area ${zonePendingDelete?.name ?? ""} deixara de aparecer no checkout do cliente.`}
        isLoading={deleteZoneMutation.isPending}
        onCancel={() => setZonePendingDelete(null)}
        onConfirm={() => zonePendingDelete && deleteZoneMutation.mutate(zonePendingDelete.id)}
        open={Boolean(zonePendingDelete)}
        title="Desativar area?"
      />
      {editingZone ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={saveZoneMutation.isPending ? undefined : closeZoneEditModal}>
          <form className="modal-card product-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleZoneSubmit} role="dialog" aria-modal="true" aria-label="Editar area de entrega">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Entrega</span>
                <h2>Editar area</h2>
              </div>
              <button aria-label="Fechar modal" className="ghost-icon-button" onClick={closeZoneEditModal} type="button">
                <X size={18} />
              </button>
            </div>
            {renderZoneFields()}
            <div className="delivery-form-actions">
              <button className="secondary-button" onClick={closeZoneEditModal} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={saveZoneMutation.isPending} type="submit">
                {saveZoneMutation.isPending ? <Loader2 className="spin" size={18} /> : null}
                Salvar area
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
