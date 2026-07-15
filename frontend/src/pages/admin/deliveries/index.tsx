import "./styles.css";
import { FormEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPinned, Pencil, Pipette, Plus, Power, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useTenant } from "../../../app/providers/tenant-provider";
import { useBodyScrollLock } from "../../../hooks/use-body-scroll-lock";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { branchesService } from "../../../services/branches";
import { deliveryZonesService, DeliveryZonePayload } from "../../../services/delivery-zones";
import { DeliveryCalculationMethod, DeliveryZone } from "../../../types/database";
import { formatCurrency } from "../../../utils/format";
import { onlyDigits } from "../../../utils/input-masks";
import { parseMoneyInput } from "../../../utils/money";

type ZoneForm = {
  branchId: string;
  name: string;
  type: "NEIGHBORHOOD" | "RADIUS" | "RADIUS_OVERFLOW";
  neighborhood: string;
  postalCodeStart: string;
  postalCodeEnd: string;
  radiusKm: string;
  distanceMode: "STRAIGHT_LINE";
  color: string;
  fee: string;
  minimumOrderValue: string;
  estimatedMinutes: string;
  status: "ACTIVE" | "INACTIVE";
};

type GeoPoint = { lat: number; lng: number };
type MapSize = { width: number; height: number };
type RadiusMapOverlay = {
  id: string;
  label: string;
  radiusKm: number;
  color: string;
  isDraft?: boolean;
};
type NeighborhoodPreviewOption = {
  label: string;
  state: "saved" | "draft" | "editing";
};
const mapGeocodeCache = new Map<string, GeoPoint | null>();
const EARTH_RADIUS_METERS = 6378137;
const MAP_RADIUS_PADDING = 1.72;
const MIN_SMALL_RADIUS_CONTEXT_METERS = 180;
const SMALL_RADIUS_ZOOM_LIMIT_METERS = 1000;
const DEFAULT_MAP_SIZE: MapSize = { width: 360, height: 280 };
const MAP_ZOOM_STEP_SCALE = 0.72;
const DELIVERY_RADIUS_COLORS = [
  "#48B04D",
  "#2D9CDB",
  "#9B2FB8",
  "#FF9800",
  "#F44336",
  "#12B8C8",
  "#FF5A1F",
  "#607D8B",
  "#E91E63",
  "#3F51B5",
  "#009688",
  "#FFC107"
];
const DEFAULT_RADIUS_COLOR = DELIVERY_RADIUS_COLORS[0];

const emptyZoneForm: ZoneForm = {
  branchId: "",
  name: "",
  type: "NEIGHBORHOOD",
  neighborhood: "",
  postalCodeStart: "",
  postalCodeEnd: "",
  radiusKm: "5,0",
  distanceMode: "STRAIGHT_LINE",
  color: DEFAULT_RADIUS_COLOR,
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

function calculationMethodLabel(method: DeliveryCalculationMethod) {
  if (method === "NEIGHBORHOOD") return "Bairro manual";
  return "Raio em km";
}

function normalizeCalculationMethod(method: DeliveryCalculationMethod | undefined): DeliveryCalculationMethod {
  return method === "NEIGHBORHOOD" ? "NEIGHBORHOOD" : "STRAIGHT_LINE";
}

function applyCalculationMethod(form: ZoneForm, method: DeliveryCalculationMethod): ZoneForm {
  if (method === "NEIGHBORHOOD") return { ...form, type: "NEIGHBORHOOD", distanceMode: "STRAIGHT_LINE" };

  return {
    ...form,
    type: form.type === "RADIUS_OVERFLOW" ? "RADIUS_OVERFLOW" : "RADIUS",
    distanceMode: "STRAIGHT_LINE"
  };
}

function normalizeMapQuery(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeComparableText(value: string | undefined) {
  return normalizeMapQuery(value ?? "");
}

function isHexColor(value: string | undefined) {
  return /^#[0-9A-Fa-f]{6}$/.test(value ?? "");
}

function formatHexInput(value: string) {
  const raw = value.trim().replace(/[^#0-9A-Fa-f]/g, "").replace(/(?!^)#/g, "");
  const withoutHash = raw.replace("#", "").slice(0, 6);
  return withoutHash ? `#${withoutHash.toUpperCase()}` : "";
}

function hexToRgb(hex: string) {
  const normalized = normalizeZoneColor(hex).replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h *= 60;
  }

  if (h < 0) h += 360;

  return {
    h: Math.round(h),
    s: max === 0 ? 0 : Math.round((delta / max) * 100),
    v: Math.round(max * 100)
  };
}

function hsvToHex(h: number, s: number, v: number) {
  const saturation = Math.min(100, Math.max(0, s)) / 100;
  const value = Math.min(100, Math.max(0, v)) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h < 60) [red, green, blue] = [chroma, x, 0];
  else if (h < 120) [red, green, blue] = [x, chroma, 0];
  else if (h < 180) [red, green, blue] = [0, chroma, x];
  else if (h < 240) [red, green, blue] = [0, x, chroma];
  else if (h < 300) [red, green, blue] = [x, 0, chroma];
  else [red, green, blue] = [chroma, 0, x];

  return [red, green, blue]
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .padStart(6, "0")
    .replace(/^/, "#");
}

function colorToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
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

function normalizeZoneColor(color: string | undefined, fallback = DEFAULT_RADIUS_COLOR) {
  return isHexColor(color) ? color!.toUpperCase() : fallback;
}

function buildOsmRadiusMap(point: GeoPoint, largestRadiusKm: number, size: MapSize, zoomScale = 1) {
  const width = Math.max(size.width, 260);
  const height = Math.max(size.height, 220);
  const largestRadiusMeters = Math.max(Number.isFinite(largestRadiusKm) ? largestRadiusKm * 1000 : 0, 0);
  const visibleRadiusMeters = getVisibleRadiusMeters(largestRadiusMeters) * zoomScale;
  const mercatorScale = 1 / Math.max(Math.cos((point.lat * Math.PI) / 180), 0.25);
  const contextRadiusPixels = Math.min(width, height) / (MAP_RADIUS_PADDING * 2);
  const metersPerPixel = (visibleRadiusMeters * mercatorScale) / contextRadiusPixels;
  const halfWidthMeters = (width * metersPerPixel) / 2;
  const halfHeightMeters = (height * metersPerPixel) / 2;
  const center = lonLatToMercator(point);
  const southwest = mercatorToLonLat(center.x - halfWidthMeters, center.y - halfHeightMeters);
  const northeast = mercatorToLonLat(center.x + halfWidthMeters, center.y + halfHeightMeters);
  const bbox = [southwest.lng, southwest.lat, northeast.lng, northeast.lat].join(",");

  return {
    radiusDiameterForKm: (radiusKm: number) => {
      const radiusMeters = Math.max(Number.isFinite(radiusKm) ? radiusKm * 1000 : 0, 0);
      const radiusPixels = (radiusMeters * mercatorScale) / metersPerPixel;
      return `${Math.max(8, Math.round(radiusPixels * 2))}px`;
    },
    url: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`
  };
}

function StaticRadiusMap({ point, overlays }: { point: GeoPoint; overlays: RadiusMapOverlay[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<MapSize>(DEFAULT_MAP_SIZE);
  const [zoomStep, setZoomStep] = useState(0);
  const orderedOverlays = [...overlays]
    .filter((overlay) => overlay.radiusKm > 0)
    .sort((a, b) => b.radiusKm - a.radiusKm);
  const largestRadiusKm = orderedOverlays.reduce((largest, overlay) => Math.max(largest, overlay.radiusKm), 0);
  const zoomScale = Math.pow(MAP_ZOOM_STEP_SCALE, zoomStep);
  const radiusMap = buildOsmRadiusMap(point, largestRadiusKm, size, zoomScale);

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
      <div className="real-map-zoom-controls" aria-label="Zoom do mapa">
        <button
          aria-label="Aproximar mapa"
          disabled={zoomStep >= 4}
          onClick={(event) => {
            event.stopPropagation();
            setZoomStep((current) => Math.min(4, current + 1));
          }}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Afastar mapa"
          disabled={zoomStep <= -3}
          onClick={(event) => {
            event.stopPropagation();
            setZoomStep((current) => Math.max(-3, current - 1));
          }}
          type="button"
        >
          -
        </button>
      </div>
      {orderedOverlays.map((overlay) => (
        <span
          className={overlay.isDraft ? "real-map-radius draft" : "real-map-radius"}
          key={overlay.id}
          style={{
            "--radius-color": overlay.color,
            "--radius-diameter": radiusMap.radiusDiameterForKm(overlay.radiusKm)
          } as CSSProperties}
          title={overlay.label}
        />
      ))}
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
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCalculationMethod, setSelectedCalculationMethod] = useState<DeliveryCalculationMethod>(
    normalizeCalculationMethod(settings.deliveryCalculationMethod)
  );
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zonePendingDelete, setZonePendingDelete] = useState<DeliveryZone | null>(null);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneModalStep, setZoneModalStep] = useState<"method" | "form">("method");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [mapPoint, setMapPoint] = useState<GeoPoint | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  useBodyScrollLock(isZoneModalOpen);

  const currentBranchId = selectedBranchId || zoneForm.branchId || branches[0]?.id || "";
  const visibleDeliveryZones = deliveryZones.filter((zone) => zone.branchId === currentBranchId);
  const hasRadiusRange = deliveryZones.some(
    (zone) => zone.branchId === currentBranchId && zone.type === "RADIUS" && zone.status === "ACTIVE"
  );
  const selectedBranchRadiusZones = deliveryZones
    .filter((zone) => zone.branchId === currentBranchId && zone.type === "RADIUS" && zone.status === "ACTIVE" && zone.radiusKm)
    .sort((a, b) => (a.radiusKm ?? 0) - (b.radiusKm ?? 0));
  const branchOverflowZone = deliveryZones.find(
    (zone) => zone.branchId === currentBranchId && zone.type === "RADIUS_OVERFLOW" && zone.status === "ACTIVE"
  );
  const resolvedZoneType: ZoneForm["type"] =
    selectedCalculationMethod === "NEIGHBORHOOD"
      ? "NEIGHBORHOOD"
      : zoneForm.type === "RADIUS_OVERFLOW"
        ? "RADIUS_OVERFLOW"
        : "RADIUS";
  const usedRadiusColors = new Set(
    selectedBranchRadiusZones
      .filter((zone) => zone.id !== editingZone?.id)
      .map((zone) => normalizeZoneColor(zone.color))
  );
  const neighborhoodPreviewOptions = (() => {
    const options = new Map<string, NeighborhoodPreviewOption>();

    visibleDeliveryZones
      .filter((zone) => zone.type === "NEIGHBORHOOD" && zone.neighborhood?.trim())
      .forEach((zone) => {
        const label = zone.neighborhood!.trim();
        const key = normalizeComparableText(label);
        const state = zone.id === editingZone?.id ? "editing" : "saved";
        options.set(key, { label, state });
      });

    const draftNeighborhood = zoneForm.neighborhood.trim();
    const draftKey = normalizeComparableText(draftNeighborhood);

    if (draftNeighborhood) {
      const existing = options.get(draftKey);
      options.set(draftKey, {
        label: draftNeighborhood,
        state: existing?.state === "saved" && editingZone ? "editing" : existing?.state ?? "draft"
      });
    }

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  })();
  const colorIsValid = isHexColor(zoneForm.color);
  const selectedColor = normalizeZoneColor(zoneForm.color);
  const colorPickerHsv = colorToHsv(selectedColor);
  const colorPickerStyles = {
    "--picker-hue": colorPickerHsv.h,
    "--picker-color": `hsl(${colorPickerHsv.h} 100% 50%)`,
    "--picker-saturation": `${colorPickerHsv.s}%`,
    "--picker-value": `${100 - colorPickerHsv.v}%`,
    "--zone-color": selectedColor
  } as CSSProperties;
  const getNextRadiusColor = () =>
    DELIVERY_RADIUS_COLORS.find((color) => !usedRadiusColors.has(color)) ?? DEFAULT_RADIUS_COLOR;
  const deliveryZoneToPayload = (zone: DeliveryZone, status = zone.status): DeliveryZonePayload => ({
    branchId: zone.branchId,
    name: zone.name,
    type: zone.type,
    neighborhood: zone.neighborhood,
    radiusKm: zone.type === "RADIUS" ? zone.radiusKm : undefined,
    distanceMode: "STRAIGHT_LINE",
    color: zone.type === "RADIUS" || zone.type === "RADIUS_OVERFLOW" ? normalizeZoneColor(zone.color) : undefined,
    fee: zone.fee,
    minimumOrderValue: zone.minimumOrderValue,
    estimatedMinutes: zone.estimatedMinutes,
    status
  });

  const saveZoneMutation = useMutation({
    mutationFn: (payload: DeliveryZonePayload) =>
      editingZone ? deliveryZonesService.update(editingZone.id, payload) : deliveryZonesService.create(payload),
    onSuccess: async (savedZone) => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-zones", tenant.id] });
      setSelectedBranchId(savedZone.branchId);
      setZoneForm((current) => ({ ...emptyZoneForm, branchId: savedZone.branchId || current.branchId }));
      setEditingZone(null);
      setIsZoneModalOpen(false);
      setZoneModalStep("method");
      setSelectedZoneId(savedZone.id);
      toast.success(editingZone ? "Area de entrega atualizada." : "Area de entrega criada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a area de entrega.")
  });
  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => deliveryZonesService.remove(zoneId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-zones", tenant.id] });
      setZonePendingDelete(null);
      toast.success("Area de entrega excluida.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel excluir a area.")
  });

  const updateColorFromHsv = (next: Partial<{ h: number; s: number; v: number }>) => {
    const nextHsv = {
      h: next.h ?? colorPickerHsv.h,
      s: next.s ?? colorPickerHsv.s,
      v: next.v ?? colorPickerHsv.v
    };
    setZoneForm((current) => ({ ...current, color: hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v) }));
  };

  const handleColorPlanePointer = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);

    updateColorFromHsv({
      s: Math.round((x / rect.width) * 100),
      v: Math.round(100 - (y / rect.height) * 100)
    });
  };
  const toggleZoneStatusMutation = useMutation({
    mutationFn: ({ zone, status }: { zone: DeliveryZone; status: "ACTIVE" | "INACTIVE" }) =>
      deliveryZonesService.update(zone.id, deliveryZoneToPayload(zone, status)),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["delivery-zones", tenant.id] });
      toast.success(variables.status === "ACTIVE" ? "Area ativada." : "Area desativada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar o status da area.")
  });
  const updateCalculationMethodMutation = useMutation({
    mutationFn: (method: DeliveryCalculationMethod) => deliveryZonesService.updateCalculationMethod(method),
    onSuccess: async ({ method }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenant", "current"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-zones", tenant.id] }),
        queryClient.invalidateQueries({ queryKey: ["public-delivery-zones"] })
      ]);
      toast.success(`Forma de cobranca alterada para ${calculationMethodLabel(method)}.`);
    },
    onError: (error) => {
      const currentMethod = normalizeCalculationMethod(settings.deliveryCalculationMethod);
      setSelectedCalculationMethod(currentMethod);
      setZoneForm((current) => applyCalculationMethod(current, currentMethod));
      toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar a forma de cobranca.");
    }
  });

  useEffect(() => {
    const persistedMethod = normalizeCalculationMethod(settings.deliveryCalculationMethod);
    setSelectedCalculationMethod(persistedMethod);
    setZoneForm((current) => applyCalculationMethod(current, persistedMethod));
  }, [settings.deliveryCalculationMethod]);

  useEffect(() => {
    const firstBranchId = branches[0]?.id;

    if (firstBranchId && !currentBranchId) {
      setSelectedBranchId(firstBranchId);
      setZoneForm((current) => ({ ...current, branchId: firstBranchId }));
    }
  }, [branches, currentBranchId]);

  const handleCalculationMethodChange = (method: DeliveryCalculationMethod) => {
    if (method === selectedCalculationMethod || updateCalculationMethodMutation.isPending) return;

    setSelectedCalculationMethod(method);
    setEditingZone(null);
    setZoneForm((current) => applyCalculationMethod({ ...emptyZoneForm, branchId: currentBranchId || current.branchId }, method));
    updateCalculationMethodMutation.mutate(method);
  };

  const openNewZoneModal = () => {
    const branchId = currentBranchId || branches[0]?.id || "";

    setEditingZone(null);
    setZoneForm(applyCalculationMethod({ ...emptyZoneForm, branchId, color: getNextRadiusColor() }, selectedCalculationMethod));
    setZoneModalStep("method");
    setIsZoneModalOpen(true);
  };

  const selectModalMethod = (method: DeliveryCalculationMethod) => {
    const branchId = currentBranchId || branches[0]?.id || "";

    if (method !== selectedCalculationMethod) {
      handleCalculationMethodChange(method);
    }

    setZoneForm((current) =>
      applyCalculationMethod({ ...emptyZoneForm, branchId: current.branchId || branchId, color: getNextRadiusColor() }, method)
    );
    setZoneModalStep("form");
  };

  const handleZoneSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!zoneForm.branchId) {
      toast.warning("Cadastre ou selecione uma filial antes de criar a area.");
      return;
    }

    if (resolvedZoneType === "NEIGHBORHOOD" && !zoneForm.neighborhood.trim()) {
      toast.warning("Informe o bairro atendido.");
      return;
    }

    if (resolvedZoneType === "RADIUS" && parseDecimalInput(zoneForm.radiusKm || "0") <= 0) {
      toast.warning("Informe um raio maior que zero.");
      return;
    }

    if (selectedCalculationMethod === "STRAIGHT_LINE" && !colorIsValid) {
      toast.warning("Informe uma cor valida no formato #RRGGBB.");
      return;
    }

    if (resolvedZoneType === "RADIUS_OVERFLOW" && !hasRadiusRange) {
      toast.warning("Cadastre ao menos um raio antes da taxa fixa fora dos raios.");
      return;
    }

    await saveZoneMutation.mutateAsync({
      branchId: zoneForm.branchId,
      name: zoneForm.name || "Area padrao",
      type: resolvedZoneType,
      neighborhood: resolvedZoneType === "NEIGHBORHOOD" ? zoneForm.neighborhood.trim() : undefined,
      postalCodeStart: undefined,
      postalCodeEnd: undefined,
      radiusKm: resolvedZoneType === "RADIUS" ? parseDecimalInput(zoneForm.radiusKm || "0") : undefined,
      distanceMode: "STRAIGHT_LINE",
      color: normalizeZoneColor(zoneForm.color),
      fee: parseMoneyInput(zoneForm.fee || "0"),
      minimumOrderValue: parseMoneyInput(zoneForm.minimumOrderValue || "0"),
      estimatedMinutes: zoneForm.estimatedMinutes ? Number(zoneForm.estimatedMinutes) : undefined,
      status: zoneForm.status
    });
  };

  const startEditZone = (zone: DeliveryZone) => {
    setSelectedBranchId(zone.branchId);
    setEditingZone(zone);
    setZoneModalStep("form");
    setIsZoneModalOpen(true);
    setZoneForm({
      branchId: zone.branchId,
      name: zone.name,
      type: zone.type === "NEIGHBORHOOD" || zone.type === "RADIUS_OVERFLOW" ? zone.type : "RADIUS",
      neighborhood: zone.neighborhood ?? "",
      postalCodeStart: "",
      postalCodeEnd: "",
      radiusKm: formatKmInput(zone.radiusKm ?? 5),
      distanceMode: "STRAIGHT_LINE",
      color: normalizeZoneColor(zone.color),
      fee: formatCurrency(zone.fee),
      minimumOrderValue: formatCurrency(zone.minimumOrderValue),
      estimatedMinutes: String(zone.estimatedMinutes ?? 35),
      status: zone.status
    });
  };

  const closeZoneEditModal = () => {
    setEditingZone(null);
    setIsZoneModalOpen(false);
    setZoneModalStep("method");
    setZoneForm((current) => ({ ...emptyZoneForm, branchId: currentBranchId || current.branchId }));
  };

  const renderCalculationMethodSelect = (id = "delivery-method-label") => (
    <div className="delivery-method-top">
      <span id={id}>Forma de cobranca</span>
      <Select
        disabled={updateCalculationMethodMutation.isPending || Boolean(editingZone)}
        value={selectedCalculationMethod}
        onValueChange={(value) => handleCalculationMethodChange(value as DeliveryCalculationMethod)}
      >
        <SelectTrigger aria-labelledby={id} className="delivery-method-select">
          {updateCalculationMethodMutation.isPending ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NEIGHBORHOOD">Bairro manual</SelectItem>
          <SelectItem value="STRAIGHT_LINE">Raio em km</SelectItem>
        </SelectContent>
      </Select>
      <small>Usada no painel e no checkout.</small>
    </div>
  );

  const renderZoneFields = () => (
    <div className="delivery-fields-grid">
      <div className="field delivery-field-half">
        <span id="delivery-branch-label">Filial</span>
        <Select
          disabled={Boolean(editingZone)}
          value={zoneForm.branchId}
          onValueChange={(value) => setZoneForm((current) => ({ ...current, branchId: value }))}
        >
          <SelectTrigger aria-labelledby="delivery-branch-label">
            <SelectValue placeholder="Selecione a filial" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="field delivery-field-half">
        <span id="delivery-status-label">Status</span>
        <Select
          value={zoneForm.status}
          onValueChange={(value) => setZoneForm((current) => ({ ...current, status: value as "ACTIVE" | "INACTIVE" }))}
        >
          <SelectTrigger aria-labelledby="delivery-status-label"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Ativa</SelectItem>
            <SelectItem value="INACTIVE">Inativa</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="field delivery-field-half">
        <span>Nome da area</span>
        <div>
          <input value={zoneForm.name} onChange={(event) => setZoneForm((current) => ({ ...current, name: event.target.value }))} placeholder="Centro ate 3km" />
        </div>
      </label>
      {selectedCalculationMethod === "STRAIGHT_LINE" ? (
        <div className="field delivery-field-half">
          <span id="delivery-range-type-label">Tipo de faixa</span>
          <Select
            value={resolvedZoneType === "RADIUS_OVERFLOW" ? "RADIUS_OVERFLOW" : "RADIUS"}
            onValueChange={(value) => setZoneForm((current) => ({ ...current, type: value as "RADIUS" | "RADIUS_OVERFLOW" }))}
          >
            <SelectTrigger aria-labelledby="delivery-range-type-label"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="RADIUS">Raio atendido</SelectItem>
              <SelectItem disabled={!hasRadiusRange} value="RADIUS_OVERFLOW">
                Fora dos raios cadastrados
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {selectedCalculationMethod === "NEIGHBORHOOD" ? (
        <label className="field delivery-field-half">
          <span>Bairro atendido</span>
          <div>
            <input value={zoneForm.neighborhood} onChange={(event) => setZoneForm((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Ex: Centro" />
          </div>
        </label>
      ) : resolvedZoneType === "RADIUS" ? (
        <label className="field delivery-field-half">
          <span>Raio maximo</span>
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
      ) : resolvedZoneType === "RADIUS_OVERFLOW" ? (
        <div className="field delivery-field-half">
          <span>Regra da faixa</span>
          <small className="muted-text">Cobra uma taxa fixa quando o endereco ficar fora de todos os raios cadastrados.</small>
        </div>
      ) : null}
      <label className="field delivery-field-third">
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
      <label className="field delivery-field-third">
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
      <label className="field delivery-field-third">
        <span>Tempo estimado</span>
        <div>
          <input min="1" type="number" value={zoneForm.estimatedMinutes} onChange={(event) => setZoneForm((current) => ({ ...current, estimatedMinutes: event.target.value }))} />
        </div>
      </label>
    </div>
  );

  const selectedBranch = branches.find((branch) => branch.id === currentBranchId);
  const radiusKm = resolvedZoneType === "RADIUS" ? parseDecimalInput(zoneForm.radiusKm || "0") : 0;
  const savedRadiusMapOverlays: RadiusMapOverlay[] = selectedBranchRadiusZones.map((zone, index) => ({
    id: zone.id,
    label: `${zone.name} - ate ${formatDistanceLabel(zone.radiusKm ?? 0)}`,
    radiusKm: zone.radiusKm ?? 0,
    color: normalizeZoneColor(zone.color, DELIVERY_RADIUS_COLORS[index % DELIVERY_RADIUS_COLORS.length])
  }));
  const modalRadiusMapOverlays: RadiusMapOverlay[] = [
    ...savedRadiusMapOverlays.filter((zone) => zone.id !== editingZone?.id),
    ...(resolvedZoneType === "RADIUS" && radiusKm > 0
      ? [
          {
            id: editingZone?.id ? `editing-${editingZone.id}` : "draft-radius",
            label: `${zoneForm.name || "Nova area"} - ate ${formatDistanceLabel(radiusKm)}`,
            radiusKm,
            color: normalizeZoneColor(zoneForm.color),
            isDraft: true
          }
        ]
      : [])
  ].filter((overlay, index, overlays) => overlays.findIndex((entry) => entry.id === overlay.id) === index);
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

  const renderMapPreview = (overlays: RadiusMapOverlay[], compact = false) => (
    <div className={compact ? "delivery-map-preview real-map-preview compact" : "delivery-map-preview real-map-preview"}>
      {mapPoint ? (
        <>
          <StaticRadiusMap point={mapPoint} overlays={overlays} />
          <span className="real-map-note">{selectedCalculationMethod === "STRAIGHT_LINE" ? "Raios fixos" : "Bairro manual"}</span>
        </>
      ) : (
        <div className="map-empty-state">
          <MapPinned size={30} />
          <strong>{isMapLoading ? "Localizando filial..." : "Mapa indisponivel"}</strong>
          <span>Cadastre latitude e longitude na filial para melhorar a visualizacao.</span>
        </div>
      )}
      <div className="real-map-caption">
        {selectedCalculationMethod === "STRAIGHT_LINE"
          ? selectedBranchRadiusZones.length > 0
            ? `${selectedBranchRadiusZones.length} faixa(s) de raio`
            : "Nenhum raio cadastrado"
          : "Clientes escolhem um bairro cadastrado"}
      </div>
    </div>
  );

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Logistica"
        title="Entregas"
        description="Defina uma forma de cobranca e configure as areas atendidas pelo restaurante."
      />

      <section className="panel delivery-method-panel">
        <div>
          <span className="eyebrow">Modalidade ativa</span>
          <h2>{calculationMethodLabel(selectedCalculationMethod)}</h2>
          <p className="muted-text">Essa regra e usada em todas as areas desta tela e no checkout do cliente.</p>
        </div>
        <div className="delivery-method-panel-actions">
          {renderCalculationMethodSelect("delivery-method-main-label")}
        </div>
      </section>

      <div className="deliveries-grid">
        <section className="panel delivery-zone-list-panel delivery-zone-list-main">
          <div className="delivery-list-heading">
            <div>
              <h2>Areas cadastradas</h2>
              <span>{visibleDeliveryZones.length} area(s) nesta filial</span>
            </div>
            <div className="delivery-list-actions">
              <div className="delivery-branch-filter">
                <span id="delivery-branch-filter-label">Filial</span>
                <Select
                  value={currentBranchId}
                  onValueChange={(value) => {
                    setSelectedBranchId(value);
                    setSelectedZoneId(null);
                  }}
                >
                  <SelectTrigger aria-labelledby="delivery-branch-filter-label">
                    <SelectValue placeholder="Selecione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button className="primary-button delivery-new-area-button" onClick={openNewZoneModal} type="button">
                <Plus size={18} />
                Nova area
              </button>
            </div>
          </div>

          <div className="delivery-zone-list">
            {visibleDeliveryZones.map((zone) => (
              <article
                className={selectedZoneId === zone.id ? "delivery-zone-card selected" : "delivery-zone-card"}
                key={zone.id}
                onClick={() => {
                  setSelectedZoneId(zone.id);
                  startEditZone(zone);
                }}
                style={{ "--zone-color": normalizeZoneColor(zone.color) } as CSSProperties}
              >
                <div>
                  <strong>
                    {zone.type === "RADIUS" || zone.type === "RADIUS_OVERFLOW" ? <i className="delivery-zone-swatch" aria-hidden="true" /> : null}
                    {zone.name}
                  </strong>
                  <span>
                    {zone.type === "NEIGHBORHOOD"
                      ? zone.neighborhood ?? "Bairro nao informado"
                      : zone.type === "RADIUS_OVERFLOW"
                        ? "Fora dos raios cadastrados"
                        : `Ate ${formatDistanceLabel(zone.radiusKm ?? 0)}`}
                  </span>
                </div>
                <div>
                  <strong>{formatCurrency(zone.fee)}</strong>
                  <span>{zone.estimatedMinutes ?? "-"} min</span>
                </div>
                <StatusBadge status={zone.status} />
                <button
                  className="delivery-status-action"
                  disabled={toggleZoneStatusMutation.isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleZoneStatusMutation.mutate({ zone, status: zone.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
                  }}
                  type="button"
                >
                  <Power size={15} />
                  {zone.status === "ACTIVE" ? "Desativar" : "Ativar"}
                </button>
                <button
                  aria-label={`Editar ${zone.name}`}
                  className="delivery-icon-action"
                  onClick={(event) => { event.stopPropagation(); startEditZone(zone); }}
                  type="button"
                >
                  <Pencil size={16} />
                </button>
                <button className="danger-link-button" onClick={(event) => { event.stopPropagation(); setZonePendingDelete(zone); }} type="button" aria-label={`Excluir ${zone.name}`}>
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
            {visibleDeliveryZones.length === 0 ? (
              <div className="delivery-empty-state">
                <MapPinned size={28} />
                <strong>Nenhuma area cadastrada nesta filial.</strong>
                <span>Crie a primeira area para liberar a entrega no checkout.</span>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="panel delivery-map-card">
          <div>
            <span className="eyebrow">Mapa do motoboy</span>
            <strong>{selectedBranch?.name ?? "Filial principal"}</strong>
            <p>{selectedBranch?.address ? `${selectedBranch.address.street}, ${selectedBranch.address.number} - ${selectedBranch.address.district}` : "Cadastre o endereco da filial para melhorar a rota."}</p>
          </div>
          {renderMapPreview(savedRadiusMapOverlays)}
          {selectedCalculationMethod === "STRAIGHT_LINE" ? (
            <div className="radius-map-legend">
              {selectedBranchRadiusZones.map((zone, index) => {
                const color = normalizeZoneColor(zone.color, DELIVERY_RADIUS_COLORS[index % DELIVERY_RADIUS_COLORS.length]);

                return (
                  <span key={zone.id} style={{ "--zone-color": color } as CSSProperties}>
                    <i aria-hidden="true" />
                    {zone.name}: ate {formatDistanceLabel(zone.radiusKm ?? 0)}
                  </span>
                );
              })}
              {branchOverflowZone ? (
                <span style={{ "--zone-color": normalizeZoneColor(branchOverflowZone.color, "#12291e") } as CSSProperties}>
                  <i aria-hidden="true" />
                  Fora dos raios: {formatCurrency(branchOverflowZone.fee)}
                </span>
              ) : null}
              {selectedBranchRadiusZones.length === 0 ? <small className="muted-text">Cadastre o primeiro raio para fixar a area no mapa.</small> : null}
            </div>
          ) : (
            <p className="delivery-map-helper">No modo bairro manual, o checkout exibe somente os bairros cadastrados pelo admin.</p>
          )}
          <a className="wide-link" href={mapUrl} rel="noreferrer" target="_blank">
            Abrir no mapa
          </a>
        </aside>
      </div>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        description={`A area ${zonePendingDelete?.name ?? ""} sera removida definitivamente. Esta acao nao pode ser desfeita.`}
        isLoading={deleteZoneMutation.isPending}
        onCancel={() => setZonePendingDelete(null)}
        onConfirm={() => zonePendingDelete && deleteZoneMutation.mutate(zonePendingDelete.id)}
        open={Boolean(zonePendingDelete)}
        title="Excluir area?"
      />

      {isZoneModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={saveZoneMutation.isPending ? undefined : closeZoneEditModal}>
          {zoneModalStep === "method" && !editingZone ? (
            <div className="modal-card delivery-method-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Escolher modalidade da area">
              <div className="modal-header">
                <div>
                  <span className="eyebrow">Nova area</span>
                  <h2>Escolha a forma de cobranca</h2>
                </div>
                <button aria-label="Fechar modal" className="ghost-icon-button" onClick={closeZoneEditModal} type="button">
                  <X size={18} />
                </button>
              </div>
              <div className="delivery-method-choice-grid">
                <button className="delivery-method-choice-card" onClick={() => selectModalMethod("STRAIGHT_LINE")} type="button">
                  <MapPinned size={24} />
                  <strong>Raio em km</strong>
                  <span>Crie faixas coloridas ao redor da filial e uma taxa fixa para fora dos raios.</span>
                </button>
                <button className="delivery-method-choice-card" onClick={() => selectModalMethod("NEIGHBORHOOD")} type="button">
                  <MapPinned size={24} />
                  <strong>Bairro manual</strong>
                  <span>Cadastre bairros atendidos e mostre um select no checkout do cliente.</span>
                </button>
              </div>
            </div>
          ) : (
            <form className="modal-card delivery-zone-modal-card" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleZoneSubmit} role="dialog" aria-modal="true" aria-label={editingZone ? "Editar area de entrega" : "Cadastrar area de entrega"}>
              <div className="modal-header">
                <div>
                  <span className="eyebrow">Entrega</span>
                  <h2>{editingZone ? "Editar area" : "Nova area"}</h2>
                </div>
                <button aria-label="Fechar modal" className="ghost-icon-button" onClick={closeZoneEditModal} type="button">
                  <X size={18} />
                </button>
              </div>
              <div className="delivery-zone-modal-layout">
                <div className="delivery-zone-modal-form">
                  {renderZoneFields()}
                </div>
                <aside className="delivery-zone-modal-preview">
                  <span className="eyebrow">Previa</span>
                  {selectedCalculationMethod === "STRAIGHT_LINE" ? (
                    <>
                      {renderMapPreview(modalRadiusMapOverlays, true)}
                      <div className="delivery-preview-color-picker" style={colorPickerStyles}>
                        <button
                          aria-label="Selecionar saturacao e brilho da cor"
                          className="delivery-color-plane"
                          onPointerDown={handleColorPlanePointer}
                          type="button"
                        >
                          <span aria-hidden="true" />
                        </button>
                        <div className="delivery-color-slider-row">
                          <button aria-label="Usar conta-gotas" className="delivery-color-eyedropper" type="button">
                            <Pipette size={18} />
                          </button>
                          <div className="delivery-color-sliders">
                            <input
                              aria-label="Matiz da cor"
                              className="delivery-color-hue-slider"
                              max={359}
                              min={0}
                              onChange={(event) => updateColorFromHsv({ h: Number(event.target.value) })}
                              type="range"
                              value={colorPickerHsv.h}
                            />
                            <input
                              aria-label="Opacidade da cor"
                              className="delivery-color-alpha-slider"
                              max={100}
                              min={0}
                              readOnly
                              type="range"
                              value={100}
                            />
                          </div>
                        </div>
                        <div className="delivery-color-value-row">
                          <div className="delivery-color-format">Hex</div>
                          <div className={colorIsValid || !zoneForm.color ? "delivery-preview-color-hex" : "delivery-preview-color-hex invalid"}>
                            <span
                              aria-hidden="true"
                              className="delivery-preview-color-dot"
                              style={{ "--zone-color": selectedColor } as CSSProperties}
                            />
                            <input
                              aria-label="Codigo hexadecimal da cor"
                              maxLength={7}
                              onChange={(event) => setZoneForm((current) => ({ ...current, color: formatHexInput(event.target.value) }))}
                              placeholder="#EB5757"
                              type="text"
                              value={zoneForm.color.toUpperCase()}
                            />
                          </div>
                          <div className="delivery-color-opacity">100%</div>
                        </div>
                        <div className="delivery-color-saved-row">
                          <strong>Saved</strong>
                          <button type="button">+ Add</button>
                        </div>
                        <div className="delivery-preview-color-swatches" aria-label="Cores salvas">
                          {DELIVERY_RADIUS_COLORS.map((color) => {
                            const isSelected = colorIsValid && normalizeZoneColor(zoneForm.color) === color;

                            return (
                              <button
                                aria-label={`Usar cor ${color}`}
                                className={isSelected ? "selected" : ""}
                                key={color}
                                onClick={() => setZoneForm((current) => ({ ...current, color }))}
                                style={{ "--zone-color": color } as CSSProperties}
                                title={color}
                                type="button"
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div className="radius-map-legend">
                        {modalRadiusMapOverlays.map((overlay) => (
                          <span key={overlay.id} style={{ "--zone-color": overlay.color } as CSSProperties}>
                            <i aria-hidden="true" />
                            {overlay.label}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="delivery-neighborhood-preview">
                      <p>Como o cliente vai ver no checkout</p>
                      <Select value="">
                        <SelectTrigger className="delivery-neighborhood-preview-trigger" aria-label="Preview do select de bairro">
                          <SelectValue placeholder="Selecione seu bairro" />
                        </SelectTrigger>
                      </Select>
                      <div className="delivery-neighborhood-preview-menu" aria-label="Lista de bairros no checkout">
                        {neighborhoodPreviewOptions.map((option) => (
                          <div className={`delivery-neighborhood-preview-option ${option.state}`} key={`${option.state}-${option.label}`}>
                            <span>{option.label}</span>
                            {option.state === "draft" ? <strong>Novo</strong> : null}
                            {option.state === "editing" ? <strong>Editando</strong> : null}
                          </div>
                        ))}
                        {neighborhoodPreviewOptions.length === 0 ? (
                          <div className="delivery-neighborhood-preview-empty">
                            Digite o nome do bairro para ver como ele aparece na lista.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div className="delivery-form-actions">
                    <button className="secondary-button" onClick={closeZoneEditModal} type="button">
                      Cancelar
                    </button>
                    <button className="primary-button" disabled={saveZoneMutation.isPending} type="submit">
                      {saveZoneMutation.isPending ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                      {editingZone ? "Salvar" : "Criar area"}
                    </button>
                  </div>
                </aside>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
