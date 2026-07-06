import "./styles.css";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Loader2, MapPinned, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useTenant } from "../../../app/providers/tenant-provider";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { adminService } from "../../../services/admin";
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
  fee: string;
  minimumOrderValue: string;
  estimatedMinutes: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyZoneForm: ZoneForm = {
  branchId: "",
  name: "",
  type: "NEIGHBORHOOD",
  neighborhood: "",
  postalCodeStart: "",
  postalCodeEnd: "",
  radiusKm: "5,0",
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

export function AdminDeliveries() {
  const { tenant, settings } = useTenant();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-bundle", tenant.id], queryFn: adminService.getTenantAdminBundle });
  const [zoneForm, setZoneForm] = useState<ZoneForm>(emptyZoneForm);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zonePendingDelete, setZonePendingDelete] = useState<DeliveryZone | null>(null);

  const saveZoneMutation = useMutation({
    mutationFn: (payload: DeliveryZonePayload) =>
      editingZone ? deliveryZonesService.update(editingZone.id, payload) : deliveryZonesService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-bundle", tenant.id] });
      setZoneForm((current) => ({ ...emptyZoneForm, branchId: current.branchId }));
      setEditingZone(null);
      toast.success(editingZone ? "Area de entrega atualizada." : "Area de entrega criada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a area de entrega.")
  });
  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => deliveryZonesService.remove(zoneId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-bundle", tenant.id] });
      setZonePendingDelete(null);
      toast.success("Area de entrega desativada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel desativar a area.")
  });

  useEffect(() => {
    const firstBranchId = data?.branches[0]?.id;

    if (firstBranchId && !zoneForm.branchId) {
      setZoneForm((current) => ({ ...current, branchId: firstBranchId }));
    }
  }, [data?.branches, zoneForm.branchId]);

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
      toast.warning("Informe um raio maior que zero.");
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
      fee: formatCurrency(zone.fee),
      minimumOrderValue: formatCurrency(zone.minimumOrderValue),
      estimatedMinutes: String(zone.estimatedMinutes ?? 35),
      status: zone.status
    });
  };

  const selectedBranch = data?.branches.find((branch) => branch.id === zoneForm.branchId);
  const mapQuery = selectedBranch?.address
    ? `${selectedBranch.address.street}, ${selectedBranch.address.number}, ${selectedBranch.address.district}, ${selectedBranch.address.city}, ${selectedBranch.address.state}`
    : `${settings.brandName}, ${tenant.slug}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Logistica"
        title="Entregas"
        description="Configure taxas por bairro ou raio e visualize a base de saida do motoboy."
      />

      <div className="deliveries-grid">
        <form className="panel delivery-zone-form" onSubmit={handleZoneSubmit}>
          <div className="delivery-heading">
            <div>
              <h2>{editingZone ? "Editar area" : "Nova area"}</h2>
              <p className="muted-text">As areas ativas aparecem no checkout do cliente.</p>
            </div>
            <Bike size={20} />
          </div>

          <div className="form-grid two-columns">
            <label className="field">
              <span>Filial</span>
              <div>
                <select value={zoneForm.branchId} onChange={(event) => setZoneForm((current) => ({ ...current, branchId: event.target.value }))}>
                  {data?.branches.map((branch) => (
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
                  <option value="RADIUS">Faixa por raio</option>
                  <option value="RADIUS_OVERFLOW">Acima do maior raio</option>
                  <option value="POSTAL_CODE">Faixa de CEP</option>
                </select>
              </div>
            </label>
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
            ) : zoneForm.type === "RADIUS_OVERFLOW" ? (
              <div className="field">
                <span>Regra da faixa</span>
                <small className="muted-text">Usada quando a distancia passar do maior raio ativo cadastrado.</small>
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

          <div className="delivery-form-actions">
            {editingZone ? (
              <button className="secondary-button" onClick={() => { setEditingZone(null); setZoneForm((current) => ({ ...emptyZoneForm, branchId: current.branchId })); }} type="button">
                Cancelar edicao
              </button>
            ) : null}
            <button className="primary-button" disabled={saveZoneMutation.isPending} type="submit">
              {saveZoneMutation.isPending ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              {editingZone ? "Salvar area" : "Criar area"}
            </button>
          </div>
        </form>

        <aside className="panel delivery-map-card">
          <div>
            <span className="eyebrow">Mapa do motoboy</span>
            <strong>{selectedBranch?.name ?? "Filial principal"}</strong>
            <p>{selectedBranch?.address ? `${selectedBranch.address.street}, ${selectedBranch.address.number} - ${selectedBranch.address.district}` : "Cadastre o endereco da filial para melhorar a rota."}</p>
          </div>
          <div className="delivery-map-preview">
            <div className={zoneForm.type === "RADIUS" ? "radius-map-target active" : "radius-map-target"}>
              <span />
              <MapPinned size={34} />
            </div>
            <span>
              {zoneForm.type === "RADIUS"
                ? `${zoneForm.radiusKm || "0,0"} km de raio`
                : zoneForm.type === "RADIUS_OVERFLOW"
                  ? "Acima do maior raio"
                  : zoneForm.type === "NEIGHBORHOOD"
                    ? "Entrega por bairro"
                    : "Faixas de CEP ativas"}
            </span>
          </div>
          <a className="wide-link" href={mapUrl} rel="noreferrer" target="_blank">
            Abrir no mapa
          </a>
        </aside>

        <section className="panel delivery-zone-list-panel">
          <h2>Areas cadastradas</h2>
          <div className="delivery-zone-list">
            {data?.deliveryZones?.map((zone) => (
              <article className="delivery-zone-card" key={zone.id}>
                <div>
                  <strong>{zone.name}</strong>
                  <span>
                    {zone.type === "POSTAL_CODE"
                      ? `${formatCep(zone.postalCodeStart ?? "")} ate ${formatCep(zone.postalCodeEnd ?? "")}`
                      : zone.type === "NEIGHBORHOOD"
                        ? zone.neighborhood ?? "Bairro nao informado"
                        : zone.type === "RADIUS_OVERFLOW"
                          ? "Acima do maior raio cadastrado"
                          : `Ate ${zone.radiusKm ?? 0} km`}
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
            {data?.deliveryZones?.length === 0 ? <p className="muted-text">Nenhuma area cadastrada ainda.</p> : null}
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
    </section>
  );
}
