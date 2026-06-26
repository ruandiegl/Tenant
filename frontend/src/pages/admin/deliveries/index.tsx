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

type ZoneForm = {
  branchId: string;
  name: string;
  type: "POSTAL_CODE" | "RADIUS";
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
  type: "POSTAL_CODE",
  postalCodeStart: "",
  postalCodeEnd: "",
  radiusKm: "5",
  fee: "8",
  minimumOrderValue: "0",
  estimatedMinutes: "35",
  status: "ACTIVE"
};

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

    await saveZoneMutation.mutateAsync({
      branchId: zoneForm.branchId,
      name: zoneForm.name || "Area padrao",
      type: zoneForm.type,
      postalCodeStart: zoneForm.type === "POSTAL_CODE" ? onlyDigits(zoneForm.postalCodeStart) : undefined,
      postalCodeEnd: zoneForm.type === "POSTAL_CODE" ? onlyDigits(zoneForm.postalCodeEnd) : undefined,
      radiusKm: zoneForm.type === "RADIUS" ? Number(zoneForm.radiusKm || 0) : undefined,
      fee: Number(zoneForm.fee || 0),
      minimumOrderValue: Number(zoneForm.minimumOrderValue || 0),
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
      postalCodeStart: formatCep(zone.postalCodeStart ?? ""),
      postalCodeEnd: formatCep(zone.postalCodeEnd ?? ""),
      radiusKm: String(zone.radiusKm ?? 5),
      fee: String(zone.fee),
      minimumOrderValue: String(zone.minimumOrderValue),
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
        description="Configure taxas por CEP ou raio e visualize a base de saida do motoboy."
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
                <select value={zoneForm.type} onChange={(event) => setZoneForm((current) => ({ ...current, type: event.target.value as "POSTAL_CODE" | "RADIUS" }))}>
                  <option value="POSTAL_CODE">Faixa de CEP</option>
                  <option value="RADIUS">Raio em km</option>
                </select>
              </div>
            </label>
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
            ) : (
              <label className="field">
                <span>Raio maximo</span>
                <div>
                  <input min="0" step="0.1" type="number" value={zoneForm.radiusKm} onChange={(event) => setZoneForm((current) => ({ ...current, radiusKm: event.target.value }))} />
                </div>
              </label>
            )}
            <label className="field">
              <span>Taxa</span>
              <div>
                <input min="0" step="0.01" type="number" value={zoneForm.fee} onChange={(event) => setZoneForm((current) => ({ ...current, fee: event.target.value }))} />
              </div>
            </label>
            <label className="field">
              <span>Pedido minimo</span>
              <div>
                <input min="0" step="0.01" type="number" value={zoneForm.minimumOrderValue} onChange={(event) => setZoneForm((current) => ({ ...current, minimumOrderValue: event.target.value }))} />
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
            <MapPinned size={34} />
            <span>{zoneForm.type === "RADIUS" ? `${zoneForm.radiusKm || 0} km de raio` : "Faixas de CEP ativas"}</span>
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
                      : `Raio de ${zone.radiusKm ?? 0} km`}
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
