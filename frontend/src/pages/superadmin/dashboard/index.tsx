import "../styles.css";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Plus, ShieldAlert } from "lucide-react";
import { PageHeader } from "../../../components/ui/page-header";
import { StatCard } from "../../../components/ui/stat-card";
import { StatusBadge } from "../../../components/ui/status-badge";
import { PlanBadge } from "../../../components/tenant-management/plan-badge";
import { UsageBar } from "../../../components/tenant-management/usage-bar";
import { tenantManagementService } from "../../../services/tenant-management";

export function SuperAdminDashboard() {
  const { data } = useQuery({
    queryKey: ["tenant-management", "dashboard"],
    queryFn: () => tenantManagementService.listTenants({ page: 1, pageSize: 50 }),
    refetchInterval: 15000
  });

  const tenants = data?.data ?? [];
  const active = tenants.filter((tenant) => tenant.status === "ACTIVE").length;
  const trial = tenants.filter((tenant) => tenant.status === "TRIAL").length;
  const suspended = tenants.filter((tenant) => tenant.status === "SUSPENDED").length;
  const totalOrders = tenants.reduce((sum, tenant) => sum + tenant.usage.ordersLast30Days, 0);
  const attentionTenant = tenants.find((tenant) =>
    Object.values(tenant.usage.resources).some((resource) => resource.limit !== null && resource.used / resource.limit >= 0.8)
  );

  return (
    <section className="screen tms-screen">
      <PageHeader
        eyebrow="Superadmin"
        title="Administracao dos tenants"
        description="Controle de ciclo de vida, planos e saude operacional dos restaurantes."
        actions={
          <Link className="pill-button" to="/superadmin/tenants">
            <Plus size={17} /> Novo tenant
          </Link>
        }
      />

      <div className="stats-grid">
        <StatCard label="Tenants" value={String(data?.meta.total ?? tenants.length)} trend={`${active} ativos`} />
        <StatCard label="Trial" value={String(trial)} trend="Onboarding em andamento" />
        <StatCard label="Suspensos" value={String(suspended)} trend="Exigem suporte" />
        <StatCard label="Pedidos 30d" value={String(totalOrders)} trend="Uso agregado" />
      </div>

      <div className="tms-dashboard-grid">
        <article className="panel tms-command-panel">
          <span className="eyebrow">Fila de atencao</span>
          {attentionTenant ? (
            <>
              <div className="tms-command-head">
                <div>
                  <h2>{attentionTenant.name}</h2>
                  <p>{attentionTenant.slug}</p>
                </div>
                <StatusBadge status={attentionTenant.status} />
              </div>
              <div className="tms-usage-stack">
                <UsageBar label="Filiais" usage={attentionTenant.usage.resources.branches} />
                <UsageBar label="Usuarios" usage={attentionTenant.usage.resources.users} />
                <UsageBar label="Produtos" usage={attentionTenant.usage.resources.products} />
              </div>
              <Link className="wide-link" to={`/superadmin/tenants/${attentionTenant.id}`}>
                <ShieldAlert size={18} /> Revisar tenant
              </Link>
            </>
          ) : (
            <div className="empty-state">
              <Building2 size={30} />
              <p>Nenhum tenant acima de 80% dos limites de plano.</p>
            </div>
          )}
        </article>

        <article className="panel tms-table-panel">
          <div className="tms-panel-title">
            <h2>Tenants recentes</h2>
            <Link to="/superadmin/tenants">Ver todos</Link>
          </div>
          <div className="tms-tenant-list">
            {tenants.slice(0, 6).map((tenant) => (
              <Link key={tenant.id} to={`/superadmin/tenants/${tenant.id}`}>
                <div>
                  <strong>{tenant.name}</strong>
                  <span>{tenant.slug}</span>
                </div>
                <PlanBadge plan={tenant.plan.name} />
                <StatusBadge status={tenant.status} />
              </Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
