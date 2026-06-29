import "../styles.css";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Copy, Edit3, ExternalLink, Eye, Loader2, Save, ShieldAlert, Store, Users } from "lucide-react";
import { toast } from "react-toastify";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { PlanBadge } from "../../../components/tenant-management/plan-badge";
import { UsageBar } from "../../../components/tenant-management/usage-bar";
import { TenantUpdatePayload, tenantManagementService } from "../../../services/tenant-management";
import { TenantStatus } from "../../../types/database";

const statusOptions: Array<{ value: TenantStatus; label: string }> = [
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "SUSPENDED", label: "Suspenso" },
  { value: "CANCELLED", label: "Cancelado" }
];

const initialEditForm: TenantUpdatePayload = {
  name: "",
  slug: "",
  legalName: "",
  document: "",
  email: "",
  phone: "",
  settings: {
    brandName: "",
    description: "",
    slogan: "",
    businessType: "",
    cuisineCategory: "",
    websiteUrl: "",
    instagramUrl: "",
    whatsapp: "",
    logoUrl: "",
    coverImageUrl: "",
    primaryColor: "#1a6b3b",
    secondaryColor: "#27ae51",
    themeFontFamily: "Inter",
    welcomeMessage: ""
  }
};

function clean(value?: string | null) {
  const next = value?.trim();
  return next ? next : undefined;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SuperAdminTenantDetail() {
  const { id = "" } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isEditing = location.pathname.endsWith("/editar");
  const [status, setStatus] = useState<TenantStatus>("SUSPENDED");
  const [statusReason, setStatusReason] = useState("");
  const [planId, setPlanId] = useState("");
  const [planReason, setPlanReason] = useState("");
  const [editForm, setEditForm] = useState<TenantUpdatePayload>(initialEditForm);
  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-management", "tenant", id],
    queryFn: () => tenantManagementService.getTenant(id),
    enabled: Boolean(id)
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["tenant-management", "plans"],
    queryFn: tenantManagementService.listPlans
  });
  const activePlans = useMemo(() => plans.filter((plan) => plan.status === "ACTIVE"), [plans]);
  const menuUrl = useMemo(() => {
    if (!tenant?.slug) return "";

    return `${window.location.origin}/${tenant.slug}/menu`;
  }, [tenant?.slug]);

  useEffect(() => {
    if (!tenant) return;

    setStatus(tenant.status);
    setPlanId(tenant.plan.id ?? activePlans[0]?.id ?? "");
    setEditForm({
      name: tenant.name,
      slug: tenant.slug,
      legalName: tenant.legalName ?? "",
      document: tenant.document ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      settings: {
        brandName: tenant.settings?.brandName ?? tenant.name,
        legalName: tenant.legalName ?? "",
        description: tenant.settings?.description ?? "",
        slogan: tenant.settings?.slogan ?? "",
        businessType: tenant.settings?.businessType ?? "",
        cuisineCategory: tenant.settings?.cuisineCategory ?? "",
        websiteUrl: tenant.settings?.websiteUrl ?? "",
        instagramUrl: tenant.settings?.instagramUrl ?? "",
        whatsapp: tenant.settings?.whatsapp ?? "",
        logoUrl: tenant.settings?.logoUrl ?? "",
        coverImageUrl: tenant.settings?.coverImageUrl ?? "",
        primaryColor: tenant.settings?.primaryColor ?? "#1a6b3b",
        secondaryColor: tenant.settings?.secondaryColor ?? "#27ae51",
        themeFontFamily: tenant.settings?.themeFontFamily ?? "Inter",
        welcomeMessage: tenant.settings?.welcomeMessage ?? ""
      }
    });
  }, [activePlans, tenant]);
  const statusMutation = useMutation({
    mutationFn: () => tenantManagementService.updateTenantStatus(id, { status, reason: statusReason }),
    onSuccess: async (updated) => {
      toast.success("Status atualizado.");
      setStatusReason("");
      setStatus(updated.status);
      queryClient.setQueryData(["tenant-management", "tenant", id], updated);
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel alterar o status.")
  });
  const planMutation = useMutation({
    mutationFn: () => tenantManagementService.updateTenantPlan(id, { planId, reason: planReason || undefined }),
    onSuccess: async (updated) => {
      toast.success("Plano atualizado.");
      setPlanReason("");
      setPlanId(updated.plan.id ?? "");
      queryClient.setQueryData(["tenant-management", "tenant", id], updated);
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
  const updateMutation = useMutation({
    mutationFn: (payload: TenantUpdatePayload) => tenantManagementService.updateTenant(id, payload),
    onSuccess: async (updated) => {
      toast.success("Tenant atualizado.");
      queryClient.setQueryData(["tenant-management", "tenant", id], updated);
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar o tenant.")
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

  const handleEditSubmit = async (event: FormEvent) => {
    event.preventDefault();

    await updateMutation.mutateAsync({
      name: editForm.name,
      slug: clean(editForm.slug) ? slugify(editForm.slug ?? "") : undefined,
      legalName: clean(editForm.legalName) || null,
      document: clean(editForm.document) || null,
      email: clean(editForm.email) || null,
      phone: clean(editForm.phone) || null,
      settings: {
        brandName: clean(editForm.settings?.brandName) || editForm.name,
        legalName: clean(editForm.legalName) || null,
        description: clean(editForm.settings?.description) || null,
        slogan: clean(editForm.settings?.slogan) || null,
        businessType: clean(editForm.settings?.businessType) || null,
        cuisineCategory: clean(editForm.settings?.cuisineCategory) || null,
        websiteUrl: clean(editForm.settings?.websiteUrl) || null,
        instagramUrl: clean(editForm.settings?.instagramUrl) || null,
        whatsapp: clean(editForm.settings?.whatsapp) || null,
        logoUrl: clean(editForm.settings?.logoUrl) || null,
        coverImageUrl: clean(editForm.settings?.coverImageUrl) || null,
        primaryColor: editForm.settings?.primaryColor || "#1a6b3b",
        secondaryColor: editForm.settings?.secondaryColor || "#27ae51",
        themeFontFamily: clean(editForm.settings?.themeFontFamily) || "Inter",
        welcomeMessage: clean(editForm.settings?.welcomeMessage) || null
      }
    });
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
          <div className="header-actions">
            {isEditing ? (
              <Link className="ghost-icon-button" to={`/superadmin/tenants/${tenant.id}`}>
                <Eye size={17} /> Visualizar
              </Link>
            ) : (
              <Link className="ghost-icon-button" to={`/superadmin/tenants/${tenant.id}/editar`}>
                <Edit3 size={17} /> Editar
              </Link>
            )}
            <Link className="ghost-icon-button" to="/superadmin/tenants">
              <ArrowLeft size={17} /> Voltar
            </Link>
          </div>
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

        <article className="panel tms-tenant-profile">
          <span className="tms-profile-mark">
            <ExternalLink size={22} />
          </span>
          <div>
            <h2>URL do menu</h2>
            <p>{menuUrl}</p>
          </div>
          <div className="tms-profile-badges">
            <button
              className="ghost-icon-button"
              onClick={async () => {
                await navigator.clipboard.writeText(menuUrl);
                toast.success("URL do menu copiada.");
              }}
              type="button"
            >
              <Copy size={16} /> Copiar
            </button>
            <a className="ghost-icon-button" href={menuUrl} rel="noreferrer" target="_blank">
              <ExternalLink size={16} /> Abrir
            </a>
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

      {isEditing ? (
        <form className="tms-detail-grid tms-edit-page" onSubmit={handleEditSubmit}>
          <article className="panel">
            <div className="tms-panel-title">
              <h2>Dados da empresa</h2>
              <Edit3 size={18} aria-hidden="true" />
            </div>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Nome comercial</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} value={editForm.name ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>URL do menu</span>
                <div>
                  <input
                    onBlur={() => setEditForm((current) => ({ ...current, slug: slugify(current.slug ?? current.name ?? "") }))}
                    onChange={(event) => setEditForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                    value={editForm.slug ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Nome de exibicao</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, brandName: event.target.value } }))}
                    value={editForm.settings?.brandName ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Razao social</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, legalName: event.target.value }))} value={editForm.legalName ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>CNPJ</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, document: event.target.value }))} value={editForm.document ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Email publico</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} type="email" value={editForm.email ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Telefone</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} value={editForm.phone ?? ""} />
                </div>
              </label>
            </div>
          </article>

          <article className="panel">
            <div className="tms-panel-title">
              <h2>Identidade publica</h2>
              <Store size={18} aria-hidden="true" />
            </div>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Tipo de negocio</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, businessType: event.target.value } }))}
                    value={editForm.settings?.businessType ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Categoria culinaria</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, cuisineCategory: event.target.value } }))}
                    value={editForm.settings?.cuisineCategory ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>WhatsApp publico</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, whatsapp: event.target.value } }))}
                    value={editForm.settings?.whatsapp ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Instagram</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, instagramUrl: event.target.value } }))}
                    value={editForm.settings?.instagramUrl ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Website</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, websiteUrl: event.target.value } }))}
                    type="url"
                    value={editForm.settings?.websiteUrl ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Logo URL</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, logoUrl: event.target.value } }))}
                    type="url"
                    value={editForm.settings?.logoUrl ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Imagem de capa URL</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, coverImageUrl: event.target.value } }))}
                    type="url"
                    value={editForm.settings?.coverImageUrl ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Fonte do tema</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, themeFontFamily: event.target.value } }))}
                    value={editForm.settings?.themeFontFamily ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Cor primaria</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, primaryColor: event.target.value } }))}
                    type="color"
                    value={editForm.settings?.primaryColor ?? "#1a6b3b"}
                  />
                </div>
              </label>
              <label className="field">
                <span>Cor secundaria</span>
                <div>
                  <input
                    onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, secondaryColor: event.target.value } }))}
                    type="color"
                    value={editForm.settings?.secondaryColor ?? "#27ae51"}
                  />
                </div>
              </label>
              <label className="field">
                <span>Descricao</span>
                <textarea
                  onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, description: event.target.value } }))}
                  value={editForm.settings?.description ?? ""}
                />
              </label>
              <label className="field">
                <span>Mensagem de boas-vindas</span>
                <textarea
                  onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, welcomeMessage: event.target.value } }))}
                  value={editForm.settings?.welcomeMessage ?? ""}
                />
              </label>
            </div>
          </article>

          <button className="primary-button tms-edit-submit" disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            Salvar alteracoes
          </button>
        </form>
      ) : null}

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
