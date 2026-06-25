import "../styles.css";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { PlanBadge } from "../../../components/tenant-management/plan-badge";
import { UsageBar } from "../../../components/tenant-management/usage-bar";
import { PlanName, TenantCreatePayload, tenantManagementService } from "../../../services/tenant-management";
import { TenantStatus } from "../../../types/database";

const initialForm: TenantCreatePayload = {
  name: "",
  slug: "",
  planName: "TRIAL",
  adminName: "",
  adminEmail: "",
  email: "",
  phone: "",
  settings: {
    primaryColor: "#1a6b3b"
  }
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SuperAdminTenants() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TenantStatus | "">("");
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TenantCreatePayload>(initialForm);
  const queryParams = useMemo(() => ({ page: 1, pageSize: 50, search, status }), [search, status]);
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-management", "tenants", queryParams],
    queryFn: () => tenantManagementService.listTenants(queryParams)
  });
  const createMutation = useMutation({
    mutationFn: tenantManagementService.createTenant,
    onSuccess: async (tenant) => {
      toast.success("Tenant criado com admin convidado.");
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
      navigate(`/superadmin/tenants/${tenant.id}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o tenant.")
  });

  const tenants = data?.data ?? [];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await createMutation.mutateAsync({
      ...form,
      slug: form.slug || slugify(form.name),
      adminName: form.adminName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      settings: {
        brandName: form.name,
        primaryColor: form.settings?.primaryColor || "#1a6b3b"
      }
    });
  };

  return (
    <section className="screen tms-screen">
      <PageHeader
        eyebrow="TMS"
        title="Tenants"
        description="Crie restaurantes, acompanhe limites e acesse detalhes operacionais."
        actions={
          <button className="pill-button" onClick={() => setIsCreating(true)} type="button">
            <Plus size={17} /> Novo tenant
          </button>
        }
      />

      <div className="tms-filter-bar">
        <label className="field">
          <span>Buscar</span>
          <div>
            <Search size={17} aria-hidden="true" />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Nome, slug ou email" value={search} />
          </div>
        </label>
        <label className="field">
          <span>Status</span>
          <div>
            <select onChange={(event) => setStatus(event.target.value as TenantStatus | "")} value={status}>
              <option value="">Todos</option>
              <option value="TRIAL">Trial</option>
              <option value="ACTIVE">Ativo</option>
              <option value="SUSPENDED">Suspenso</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </label>
      </div>

      <article className="panel tms-table-panel">
        <div className="tms-table-head">
          <span>Tenant</span>
          <span>Plano</span>
          <span>Status</span>
          <span>Uso</span>
          <span>Pedidos 30d</span>
        </div>
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={28} />
            <p>Carregando tenants...</p>
          </div>
        ) : null}
        {tenants.map((tenant) => (
          <Link className="tms-table-row" key={tenant.id} to={`/superadmin/tenants/${tenant.id}`}>
            <div className="tms-tenant-cell">
              <span className="tms-logo-mark" style={{ background: tenant.settings?.primaryColor ?? "#1a6b3b" }}>
                {tenant.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{tenant.name}</strong>
                <span>{tenant.slug}</span>
              </div>
            </div>
            <PlanBadge plan={tenant.plan.name} />
            <StatusBadge status={tenant.status} />
            <div className="tms-row-usage">
              <UsageBar label="Usuarios" usage={tenant.usage.resources.users} />
            </div>
            <strong>{tenant.usage.ordersLast30Days}</strong>
          </Link>
        ))}
        {!isLoading && tenants.length === 0 ? (
          <div className="empty-state">
            <Building2 size={30} />
            <p>Nenhum tenant encontrado com os filtros atuais.</p>
          </div>
        ) : null}
      </article>

      {isCreating ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card tms-create-modal" onSubmit={handleSubmit}>
            <header className="modal-header">
              <div>
                <span className="eyebrow">Novo tenant</span>
                <h2>Criar restaurante</h2>
              </div>
              <button className="ghost-icon-button" onClick={() => setIsCreating(false)} type="button">
                <X size={18} /> Fechar
              </button>
            </header>

            <div className="form-grid two-columns">
              <label className="field">
                <span>Nome comercial</span>
                <div>
                  <input
                    required
                    onBlur={() => setForm((current) => ({ ...current, slug: current.slug || slugify(current.name) }))}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    value={form.name}
                  />
                </div>
              </label>
              <label className="field">
                <span>Slug publico</span>
                <div>
                  <input
                    required
                    pattern="[a-z0-9-]+"
                    onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                    value={form.slug}
                  />
                </div>
              </label>
              <label className="field">
                <span>Plano inicial</span>
                <div>
                  <select onChange={(event) => setForm((current) => ({ ...current, planName: event.target.value as PlanName }))} value={form.planName}>
                    <option value="TRIAL">Trial</option>
                    <option value="BASIC">Basic</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              </label>
              <label className="field">
                <span>Cor da marca</span>
                <div>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({ ...current, settings: { ...current.settings, primaryColor: event.target.value } }))
                    }
                    type="color"
                    value={form.settings?.primaryColor ?? "#1a6b3b"}
                  />
                </div>
              </label>
              <label className="field">
                <span>Nome do admin</span>
                <div>
                  <input onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))} value={form.adminName} />
                </div>
              </label>
              <label className="field">
                <span>Email do admin</span>
                <div>
                  <input
                    required
                    onChange={(event) => setForm((current) => ({ ...current, adminEmail: event.target.value }))}
                    type="email"
                    value={form.adminEmail}
                  />
                </div>
              </label>
              <label className="field">
                <span>Email publico</span>
                <div>
                  <input onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" value={form.email} />
                </div>
              </label>
              <label className="field">
                <span>Telefone</span>
                <div>
                  <input onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} />
                </div>
              </label>
            </div>

            <button className="primary-button" disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Criar tenant
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
