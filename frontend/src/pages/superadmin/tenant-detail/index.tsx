import "../styles.css";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Copy, Loader2, Save, ShieldAlert, Store, Users } from "lucide-react";
import { toast } from "react-toastify";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { PlanBadge } from "../../../components/tenant-management/plan-badge";
import { UsageBar } from "../../../components/tenant-management/usage-bar";
import { tenantManagementService } from "../../../services/tenant-management";
import { TenantStatus } from "../../../types/database";

const statusOptions: Array<{ value: TenantStatus; label: string }> = [
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "SUSPENDED", label: "Suspenso" },
  { value: "CANCELLED", label: "Cancelado" }
];

export function SuperAdminTenantDetail() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TenantStatus>("SUSPENDED");
  const [statusReason, setStatusReason] = useState("");
  const [planId, setPlanId] = useState("");
  const [planReason, setPlanReason] = useState("");
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-management", "tenant", id],
    queryFn: () => tenantManagementService.getTenant(id),
    enabled: Boolean(id)
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["tenant-management", "plans"],
    queryFn: tenantManagementService.listPlans
  });
  const activePlans = plans.filter((plan) => plan.status === "ACTIVE");

  useEffect(() => {
    if (tenant?.plan.id) {
      setPlanId(tenant.plan.id);
      return;
    }

    if (!planId && activePlans[0]?.id) {
      setPlanId(activePlans[0].id);
    }
  }, [activePlans, planId, tenant?.plan.id]);
  const statusMutation = useMutation({
    mutationFn: () => tenantManagementService.updateTenantStatus(id, { status, reason: statusReason }),
    onSuccess: async () => {
      toast.success("Status atualizado.");
      setStatusReason("");
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar o status.")
  });
  const planMutation = useMutation({
    mutationFn: () => tenantManagementService.updateTenantPlan(id, { planId, reason: planReason || undefined }),
    onSuccess: async () => {
      toast.success("Plano atualizado.");
      setPlanReason("");
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar o plano.")
  });
  const inviteMutation = useMutation({
    mutationFn: (tenantUserId: string) => tenantManagementService.createInviteLink(id, tenantUserId),
    onSuccess: async (invite) => {
      await navigator.clipboard.writeText(invite.acceptUrl);
      toast.success("Novo link de convite copiado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel gerar o convite.")
  });

  const handleStatusSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await statusMutation.mutateAsync();
  };

  const handlePlanSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!planId) {
      toast.warning("Selecione um plano ativo antes de atualizar.");
      return;
    }
    await planMutation.mutateAsync();
  };

  if (isLoading || !tenant) {
    return (
      <section className="screen tms-screen">
        <div className="panel empty-state">
          <Loader2 className="spin" size={28} />
          <p>Carregando tenant...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="screen tms-screen">
      <PageHeader
        eyebrow="Tenant"
        title={tenant.name}
        description={`${tenant.slug} - criado em ${new Date(tenant.createdAt).toLocaleDateString("pt-BR")}`}
        actions={
          <Link className="ghost-icon-button" to="/superadmin/tenants">
            <ArrowLeft size={17} /> Voltar
          </Link>
        }
      />

      <div className="tms-detail-hero">
        <article className="panel tms-tenant-profile">
          <span className="tms-profile-mark" style={{ background: tenant.settings?.primaryColor ?? "#1a6b3b" }}>
            {tenant.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h2>{tenant.settings?.brandName ?? tenant.name}</h2>
            <p>{tenant.email ?? "Email publico nao configurado"}</p>
          </div>
          <div className="tms-profile-badges">
            <StatusBadge status={tenant.status} />
            <PlanBadge plan={tenant.plan.name} />
          </div>
        </article>

        <article className="panel tms-usage-panel">
          <div className="tms-panel-title">
            <h2>Uso do plano</h2>
            <strong>{tenant.usage.ordersLast30Days} pedidos em 30d</strong>
          </div>
          <div className="tms-usage-grid">
            <UsageBar label="Filiais" usage={tenant.usage.resources.branches} />
            <UsageBar label="Usuarios" usage={tenant.usage.resources.users} />
            <UsageBar label="Produtos" usage={tenant.usage.resources.products} />
            <UsageBar label="Cupons" usage={tenant.usage.resources.coupons} />
          </div>
        </article>
      </div>

      <div className="tms-detail-grid">
        <article className="panel">
          <div className="tms-panel-title">
            <h2>Ciclo de vida</h2>
            <ShieldAlert size={18} aria-hidden="true" />
          </div>
          <form className="form-grid" onSubmit={handleStatusSubmit}>
            <label className="field">
              <span>Novo status</span>
              <div>
                <select onChange={(event) => setStatus(event.target.value as TenantStatus)} value={status}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="field">
              <span>Motivo</span>
              <textarea required onChange={(event) => setStatusReason(event.target.value)} value={statusReason} />
            </label>
            <button className="primary-button" disabled={statusMutation.isPending} type="submit">
              {statusMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Atualizar status
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="tms-panel-title">
            <h2>Plano</h2>
            <PlanBadge plan={tenant.plan.name} />
          </div>
          <form className="form-grid" onSubmit={handlePlanSubmit}>
            <label className="field">
              <span>Novo plano</span>
              <div>
                <select onChange={(event) => setPlanId(event.target.value)} value={planId}>
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price > 0 ? `R$ ${plan.price.toFixed(2)}` : "sob consulta"}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="field">
              <span>Observacao</span>
              <textarea onChange={(event) => setPlanReason(event.target.value)} value={planReason} />
            </label>
            <button className="primary-button" disabled={planMutation.isPending || !planId} type="submit">
              {planMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Atualizar plano
            </button>
          </form>
        </article>
      </div>

      <div className="tms-detail-grid">
        <article className="panel">
          <div className="tms-panel-title">
            <h2>Usuarios</h2>
            <Users size={18} aria-hidden="true" />
          </div>
          <div className="tms-compact-list">
            {tenant.users.map((membership) => (
              <div key={membership.id}>
                <div>
                  <strong>{membership.user.name}</strong>
                  <span>{membership.user.email}</span>
                </div>
                <StatusBadge status={membership.status} />
                {membership.status !== "ACTIVE" ? (
                  <button
                    aria-label="Gerar link de convite"
                    className="ghost-icon-button"
                    disabled={inviteMutation.isPending}
                    onClick={() => inviteMutation.mutate(membership.id)}
                    type="button"
                  >
                    <Copy size={16} /> Link
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="tms-panel-title">
            <h2>Filiais</h2>
            <Store size={18} aria-hidden="true" />
          </div>
          <div className="tms-compact-list">
            {tenant.branches.map((branch) => (
              <div key={branch.id}>
                <div>
                  <strong>{branch.name}</strong>
                  <span>{branch.slug}</span>
                </div>
                <StatusBadge status={branch.status} />
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel tms-table-panel">
        <div className="tms-panel-title">
          <h2>Auditoria recente</h2>
          <CalendarClock size={18} aria-hidden="true" />
        </div>
        <div className="tms-audit-list">
          {tenant.auditLogs.map((log) => (
            <div key={log.id}>
              <time>{new Date(log.createdAt).toLocaleString("pt-BR")}</time>
              <strong>{log.action}</strong>
              <span>{log.user?.name ?? "Sistema"} em {log.entity}</span>
            </div>
          ))}
          {tenant.auditLogs.length === 0 ? <p className="muted-text">Sem eventos auditados para este tenant.</p> : null}
        </div>
      </article>
    </section>
  );
}
