import "../styles.css";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit3, Infinity, Loader2, PackageCheck, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { PlanBadge } from "../../../components/tenant-management/plan-badge";
import { PlanMutationPayload, PlatformPlan, RecordStatus, tenantManagementService } from "../../../services/tenant-management";
import { formatCurrency } from "../../../utils/format";

type PlanForm = {
  name: string;
  description: string;
  price: string;
  status: RecordStatus;
  maxUsers: string;
  maxBranches: string;
  products: string;
  coupons: string;
  ordersPerMonth: string;
  capabilities: PlatformPlan["capabilities"];
};

const capabilityLabels: Array<{ key: keyof PlatformPlan["capabilities"]; label: string }> = [
  { key: "onlineOrders", label: "Pedidos online" },
  { key: "menuBuilder", label: "Cardapio editavel" },
  { key: "kitchen", label: "Fila de cozinha" },
  { key: "coupons", label: "Cupons" },
  { key: "reports", label: "Relatorios" },
  { key: "stockControl", label: "Controle de estoque" },
  { key: "customBranding", label: "Marca e tema" },
  { key: "multiBranch", label: "Multi-filial" },
  { key: "apiAccess", label: "Acesso API" },
  { key: "prioritySupport", label: "Suporte prioritario" }
];

const emptyCapabilities: PlatformPlan["capabilities"] = {
  onlineOrders: true,
  menuBuilder: true,
  kitchen: true,
  coupons: false,
  reports: false,
  stockControl: true,
  customBranding: false,
  multiBranch: false,
  apiAccess: false,
  prioritySupport: false
};

const emptyForm: PlanForm = {
  name: "",
  description: "",
  price: "0",
  status: "ACTIVE",
  maxUsers: "",
  maxBranches: "",
  products: "",
  coupons: "",
  ordersPerMonth: "",
  capabilities: emptyCapabilities
};

function asInputValue(value?: number | null) {
  return value === null || value === undefined ? "" : String(value);
}

function numberOrNull(value: string) {
  const cleanValue = value.trim();
  return cleanValue === "" ? null : Number(cleanValue);
}

function formFromPlan(plan: PlatformPlan): PlanForm {
  return {
    name: plan.name,
    description: plan.description ?? "",
    price: String(plan.price),
    status: plan.status,
    maxUsers: asInputValue(plan.limits.users),
    maxBranches: asInputValue(plan.limits.branches),
    products: asInputValue(plan.limits.products),
    coupons: asInputValue(plan.limits.coupons),
    ordersPerMonth: asInputValue(plan.limits.ordersPerMonth),
    capabilities: plan.capabilities
  };
}

function payloadFromForm(form: PlanForm): PlanMutationPayload {
  return {
    name: form.name.trim().toUpperCase(),
    description: form.description.trim() || null,
    price: Number(form.price || 0),
    maxUsers: numberOrNull(form.maxUsers),
    maxBranches: numberOrNull(form.maxBranches),
    limits: {
      products: numberOrNull(form.products),
      coupons: numberOrNull(form.coupons),
      ordersPerMonth: numberOrNull(form.ordersPerMonth)
    },
    capabilities: form.capabilities,
    status: form.status
  };
}

function limitText(value?: number | null) {
  return value === null || value === undefined ? "Ilimitado" : value.toLocaleString("pt-BR");
}

export function SuperAdminPlans() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<PlatformPlan | null>(null);
  const [planPendingDelete, setPlanPendingDelete] = useState<PlatformPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["tenant-management", "plans"],
    queryFn: tenantManagementService.listPlans
  });
  const activePlans = useMemo(() => plans.filter((plan) => plan.status === "ACTIVE").length, [plans]);

  const createMutation = useMutation({
    mutationFn: (payload: PlanMutationPayload & { name: string }) => tenantManagementService.createPlan(payload),
    onSuccess: async () => {
      toast.success("Plano criado.");
      setIsCreating(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["tenant-management", "plans"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error && error.message.includes("404") ? "Rota de planos indisponivel. Reinicie o backend." : "Nao foi possivel criar o plano.")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PlanMutationPayload }) => tenantManagementService.updatePlan(id, payload),
    onSuccess: async () => {
      toast.success("Plano atualizado.");
      setEditingPlan(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error && error.message.includes("404") ? "Rota de planos indisponivel. Reinicie o backend." : "Nao foi possivel atualizar o plano.")
  });

  const deleteMutation = useMutation({
    mutationFn: tenantManagementService.deletePlan,
    onSuccess: async () => {
      toast.success("Plano desativado.");
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error && error.message.includes("404") ? "Rota de planos indisponivel. Reinicie o backend." : "Nao foi possivel desativar o plano.")
  });

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setIsCreating(true);
  };

  const openEdit = (plan: PlatformPlan) => {
    setIsCreating(false);
    setEditingPlan(plan);
    setForm(formFromPlan(plan));
  };

  const closeModal = () => {
    setEditingPlan(null);
    setIsCreating(false);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = payloadFromForm(form);

    try {
      if (editingPlan?.id) {
        await updateMutation.mutateAsync({ id: editingPlan.id, payload });
        return;
      }

      if (!payload.name) {
        toast.warning("Informe o nome do plano.");
        return;
      }

      await createMutation.mutateAsync(payload as PlanMutationPayload & { name: string });
    } catch {
      // Mutations already show a toast through onError.
    }
  };

  const handleDelete = async (plan: PlatformPlan) => {
    if (!plan.id) {
      toast.info("Reinicie o backend para persistir os planos antes de desativar.");
      return;
    }

    setPlanPendingDelete(plan);
  };

  const confirmDeletePlan = async () => {
    if (!planPendingDelete?.id) return;
    try {
      await deleteMutation.mutateAsync(planPendingDelete.id);
      setPlanPendingDelete(null);
    } catch {
      // Mutations already show a toast through onError.
    }
  };

  return (
    <section className="screen tms-screen">
      <PageHeader
        eyebrow="Planos"
        title="Gerenciamento de planos"
        description="Defina limites, recursos e capacidades comerciais dos tenants."
        actions={
          <button className="pill-button" onClick={openCreate} type="button">
            <Plus size={17} /> Novo plano
          </button>
        }
      />

      <div className="tms-dashboard-grid tms-plan-summary">
        <article className="stat-card">
          <span>Planos ativos</span>
          <strong>{activePlans}</strong>
          <small>Disponiveis para tenants</small>
        </article>
        <article className="stat-card">
          <span>Planos cadastrados</span>
          <strong>{plans.length}</strong>
          <small>Inclui inativos</small>
        </article>
      </div>

      <article className="panel tms-table-panel">
        <div className="tms-plan-table-head">
          <span>Plano</span>
          <span>Preco</span>
          <span>Limites</span>
          <span>Capacidades</span>
          <span>Status</span>
          <span>Acoes</span>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={28} />
            <p>Carregando planos...</p>
          </div>
        ) : null}

        {plans.map((plan) => (
          <div className="tms-plan-table-row" key={plan.id || plan.name}>
            <div className="tms-plan-name">
              <PlanBadge plan={plan.name} />
              <div>
                <strong>{plan.name}</strong>
                <span>{plan.description ?? "Sem descricao"}</span>
              </div>
            </div>
            <strong>{plan.price > 0 ? formatCurrency(plan.price) : "Sob consulta"}</strong>
            <div className="tms-plan-limits">
              <span>Filiais {limitText(plan.limits.branches)}</span>
              <span>Usuarios {limitText(plan.limits.users)}</span>
              <span>Produtos {limitText(plan.limits.products)}</span>
              <span>Pedidos/mes {limitText(plan.limits.ordersPerMonth)}</span>
            </div>
            <div className="tms-capability-list">
              {capabilityLabels
                .filter((capability) => plan.capabilities[capability.key])
                .slice(0, 4)
                .map((capability) => (
                  <span key={capability.key}>
                    <CheckCircle2 size={13} /> {capability.label}
                  </span>
                ))}
            </div>
            <StatusBadge status={plan.status} />
            <div className="tms-row-actions">
              <button className="tms-action-button" onClick={() => openEdit(plan)} title="Editar plano" type="button">
                <Edit3 size={16} />
              </button>
              <button className="tms-action-button danger" disabled={!plan.id} onClick={() => handleDelete(plan)} title="Desativar plano" type="button">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </article>

      {isCreating || editingPlan ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card tms-create-modal" onSubmit={handleSubmit}>
            <header className="modal-header">
              <div>
                <span className="eyebrow">{editingPlan ? "Editar plano" : "Novo plano"}</span>
                <h2>{editingPlan?.name ?? "Plano da plataforma"}</h2>
              </div>
              <button className="ghost-icon-button" onClick={closeModal} type="button">
                <X size={18} /> Fechar
              </button>
            </header>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Nome</span>
                <div>
                  <PackageCheck size={18} />
                  <input
                    required
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value.toUpperCase() }))}
                    value={form.name}
                  />
                </div>
              </label>
              <label className="field">
                <span>Status</span>
                <div>
                  <select onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as RecordStatus }))} value={form.status}>
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>
              </label>
              <label className="field">
                <span>Preco mensal</span>
                <div>
                  <input
                    min={0}
                    onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                    step="0.01"
                    type="number"
                    value={form.price}
                  />
                </div>
              </label>
              <label className="field">
                <span>Usuarios</span>
                <div>
                  <input
                    min={1}
                    onChange={(event) => setForm((current) => ({ ...current, maxUsers: event.target.value }))}
                    placeholder="Ilimitado"
                    type="number"
                    value={form.maxUsers}
                  />
                </div>
              </label>
              <label className="field">
                <span>Filiais</span>
                <div>
                  <input
                    min={1}
                    onChange={(event) => setForm((current) => ({ ...current, maxBranches: event.target.value }))}
                    placeholder="Ilimitado"
                    type="number"
                    value={form.maxBranches}
                  />
                </div>
              </label>
              <label className="field">
                <span>Produtos</span>
                <div>
                  <input
                    min={1}
                    onChange={(event) => setForm((current) => ({ ...current, products: event.target.value }))}
                    placeholder="Ilimitado"
                    type="number"
                    value={form.products}
                  />
                </div>
              </label>
              <label className="field">
                <span>Cupons</span>
                <div>
                  <input
                    min={1}
                    onChange={(event) => setForm((current) => ({ ...current, coupons: event.target.value }))}
                    placeholder="Ilimitado"
                    type="number"
                    value={form.coupons}
                  />
                </div>
              </label>
              <label className="field">
                <span>Pedidos por mes</span>
                <div>
                  <Infinity size={18} />
                  <input
                    min={1}
                    onChange={(event) => setForm((current) => ({ ...current, ordersPerMonth: event.target.value }))}
                    placeholder="Ilimitado"
                    type="number"
                    value={form.ordersPerMonth}
                  />
                </div>
              </label>
              <label className="field">
                <span>Descricao</span>
                <textarea onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} />
              </label>

              <div className="tms-form-section">
                <span className="eyebrow">Capacidades</span>
              </div>
              <div className="tms-capability-editor">
                {capabilityLabels.map((capability) => (
                  <label key={capability.key}>
                    <input
                      checked={form.capabilities[capability.key]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          capabilities: { ...current.capabilities, [capability.key]: event.target.checked }
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{capability.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="primary-button" disabled={createMutation.isPending || updateMutation.isPending} type="submit">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Salvar plano
            </button>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(planPendingDelete)}
        title="Desativar plano"
        description={`Desativar ${planPendingDelete?.name ?? "este plano"} remove o plano das novas selecoes. Tenants ja vinculados continuam com o plano atual.`}
        confirmLabel="Desativar plano"
        isLoading={deleteMutation.isPending}
        onCancel={() => setPlanPendingDelete(null)}
        onConfirm={() => void confirmDeletePlan()}
      />
    </section>
  );
}
