import "../styles.css";
import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Copy, Edit3, Eye, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { PlanBadge } from "../../../components/tenant-management/plan-badge";
import { UsageBar } from "../../../components/tenant-management/usage-bar";
import {
  TenantCreatePayload,
  TenantInviteLink,
  TenantManagementSummary,
  TenantUpdatePayload,
  tenantManagementService
} from "../../../services/tenant-management";
import { TenantStatus } from "../../../types/database";

const initialForm: TenantCreatePayload = {
  name: "",
  slug: "",
  legalName: "",
  document: "",
  planId: "",
  planName: "TRIAL",
  adminName: "",
  adminEmail: "",
  email: "",
  phone: "",
  branch: {
    name: "Matriz",
    address: {
      street: "",
      number: "",
      district: "",
      city: "",
      state: "",
      postalCode: ""
    }
  },
  settings: {
    logoUrl: "",
    coverImageUrl: "",
    primaryColor: "#1a6b3b",
    secondaryColor: "#27ae51",
    themeFontFamily: "Inter"
  }
};

const initialEditForm: TenantUpdatePayload = {
  name: "",
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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clean(value?: string | null) {
  const next = value?.trim();
  return next ? next : undefined;
}

function buildBranchPayload(branch: TenantCreatePayload["branch"]) {
  const address = branch?.address;

  if (!address) {
    return undefined;
  }

  const requiredAddress = [address.street, address.number, address.district, address.city, address.state, address.postalCode];
  const hasAnyAddress = requiredAddress.some((value) => Boolean(clean(value)));

  if (!hasAnyAddress) {
    return undefined;
  }

  const isAddressComplete = requiredAddress.every((value) => Boolean(clean(value)));

  if (!isAddressComplete) {
    throw new Error("Preencha todos os campos obrigatorios do endereco da matriz ou deixe o bloco em branco.");
  }

  return {
    name: clean(branch?.name) ?? "Matriz",
    phone: clean(branch?.phone),
    email: clean(branch?.email),
    address: {
      street: clean(address.street)!,
      number: clean(address.number)!,
      complement: clean(address.complement),
      district: clean(address.district)!,
      city: clean(address.city)!,
      state: clean(address.state)!.toUpperCase(),
      postalCode: clean(address.postalCode)!,
      reference: clean(address.reference)
    }
  };
}

export function SuperAdminTenants() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TenantStatus | "">("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantManagementSummary | null>(null);
  const [tenantPendingDelete, setTenantPendingDelete] = useState<TenantManagementSummary | null>(null);
  const [createdInvite, setCreatedInvite] = useState<TenantInviteLink | null>(null);
  const [form, setForm] = useState<TenantCreatePayload>(initialForm);
  const [editForm, setEditForm] = useState<TenantUpdatePayload>(initialEditForm);
  const queryParams = useMemo(() => ({ page: 1, pageSize: 50, search, status }), [search, status]);
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-management", "tenants", queryParams],
    queryFn: () => tenantManagementService.listTenants(queryParams)
  });
  const { data: plans = [] } = useQuery({
    queryKey: ["tenant-management", "plans"],
    queryFn: tenantManagementService.listPlans
  });
  const activePlans = plans.filter((plan) => plan.status === "ACTIVE");
  const createMutation = useMutation({
    mutationFn: tenantManagementService.createTenant,
    onSuccess: async (tenant) => {
      toast.success("Tenant criado com admin convidado.");
      setCreatedInvite(tenant.invite ?? null);
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel criar o tenant.")
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TenantUpdatePayload }) => tenantManagementService.updateTenant(id, payload),
    onSuccess: async () => {
      toast.success("Tenant atualizado.");
      setEditingTenant(null);
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar o tenant.")
  });
  const deleteMutation = useMutation({
    mutationFn: tenantManagementService.deleteTenant,
    onSuccess: async () => {
      toast.success("Tenant deletado.");
      await queryClient.invalidateQueries({ queryKey: ["tenant-management"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel deletar o tenant.")
  });

  const tenants = data?.data ?? [];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    let branch: ReturnType<typeof buildBranchPayload>;

    try {
      branch = buildBranchPayload(form.branch);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revise os campos do tenant.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...form,
        slug: clean(form.slug) || slugify(form.name),
        planId: clean(form.planId),
        adminName: clean(form.adminName),
        legalName: clean(form.legalName),
        document: clean(form.document),
        email: clean(form.email),
        phone: clean(form.phone),
        branch,
        settings: {
          brandName: form.name,
          legalName: clean(form.legalName),
          description: clean(form.settings?.description),
          slogan: clean(form.settings?.slogan),
          businessType: clean(form.settings?.businessType),
          cuisineCategory: clean(form.settings?.cuisineCategory),
          websiteUrl: clean(form.settings?.websiteUrl),
          instagramUrl: clean(form.settings?.instagramUrl),
          whatsapp: clean(form.settings?.whatsapp),
          logoUrl: clean(form.settings?.logoUrl),
          coverImageUrl: clean(form.settings?.coverImageUrl),
          primaryColor: form.settings?.primaryColor || "#1a6b3b",
          secondaryColor: form.settings?.secondaryColor || "#27ae51",
          themeFontFamily: clean(form.settings?.themeFontFamily) || "Inter",
          welcomeMessage: clean(form.settings?.welcomeMessage)
        }
      });
    } catch {
      // The mutation onError already shows the API message.
    }
  };

  const openEdit = (tenant: TenantManagementSummary) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name,
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
  };

  const handleEditSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTenant) return;

    try {
      await updateMutation.mutateAsync({
        id: editingTenant.id,
        payload: {
          name: editForm.name,
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
        }
      });
    } catch {
      // The mutation onError already shows the API message.
    }
  };

  const handleDelete = async (tenant: TenantManagementSummary) => {
    setTenantPendingDelete(tenant);
  };

  const confirmDeleteTenant = async () => {
    if (!tenantPendingDelete) return;
    try {
      await deleteMutation.mutateAsync(tenantPendingDelete.id);
      setTenantPendingDelete(null);
    } catch {
      // The mutation onError already shows the API message.
    }
  };

  const copyInvite = async () => {
    if (!createdInvite) return;
    await navigator.clipboard.writeText(createdInvite.acceptUrl);
    toast.success("Link de convite copiado.");
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
          <span>Acoes</span>
        </div>
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="spin" size={28} />
            <p>Carregando tenants...</p>
          </div>
        ) : null}
        {tenants.map((tenant) => (
          <div className="tms-table-row" key={tenant.id}>
            <div className="tms-tenant-cell">
              {tenant.settings?.logoUrl ? (
                <img className="tms-logo-image" src={tenant.settings.logoUrl} alt={tenant.name} />
              ) : (
                <span className="tms-logo-mark" style={{ background: tenant.settings?.primaryColor ?? "#1a6b3b" }}>
                  {tenant.name.slice(0, 2).toUpperCase()}
                </span>
              )}
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
            <div className="tms-row-actions">
              <Link className="tms-action-button" title="Ver tenant" to={`/superadmin/tenants/${tenant.id}`}>
                <Eye size={16} />
              </Link>
              <Link className="tms-action-button" title="Editar tenant" to={`/superadmin/tenants/${tenant.id}/editar`}>
                <Edit3 size={16} />
              </Link>
              <button className="tms-action-button danger" onClick={() => handleDelete(tenant)} title="Deletar tenant" type="button">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
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
              <button className="ghost-icon-button" onClick={() => { setIsCreating(false); setCreatedInvite(null); }} type="button">
                <X size={18} /> Fechar
              </button>
            </header>

            {createdInvite ? (
              <div className="tms-invite-result">
                <span className="eyebrow">Convite gerado</span>
                <strong>{createdInvite.email}</strong>
                <p>Envie este link para o admin definir a senha e acessar o painel do restaurante.</p>
                <input readOnly value={createdInvite.acceptUrl} />
                <button className="primary-button" onClick={copyInvite} type="button">
                  <Copy size={18} /> Copiar link
                </button>
              </div>
            ) : null}

            <div className="form-grid two-columns">
              <div className="tms-form-section">
                <span className="eyebrow">Empresa</span>
              </div>
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
                    pattern="^[a-z0-9\\-]+$"
                    onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                    value={form.slug}
                  />
                </div>
              </label>
              <label className="field">
                <span>Razao social</span>
                <div>
                  <input onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} value={form.legalName} />
                </div>
              </label>
              <label className="field">
                <span>CNPJ</span>
                <div>
                  <input onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))} value={form.document} />
                </div>
              </label>
              <label className="field">
                <span>Plano inicial</span>
                <div>
                  <select
                    onChange={(event) => setForm((current) => ({ ...current, planId: event.target.value }))}
                    value={form.planId}
                  >
                    <option value="">Selecionar plano</option>
                    {activePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="field">
                <span>Tipo de negocio</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, businessType: event.target.value } }))}
                    placeholder="Restaurante, pizzaria, dark kitchen"
                    value={form.settings?.businessType ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Categoria culinaria</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, cuisineCategory: event.target.value } }))}
                    placeholder="Brasileira, japonesa, hamburgueria"
                    value={form.settings?.cuisineCategory ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Descricao</span>
                <textarea
                  onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, description: event.target.value } }))}
                  value={form.settings?.description ?? ""}
                />
              </label>
              <label className="field">
                <span>Slogan</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, slogan: event.target.value } }))}
                    value={form.settings?.slogan ?? ""}
                  />
                </div>
              </label>
              <div className="tms-form-section">
                <span className="eyebrow">Acesso</span>
              </div>
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
              <label className="field">
                <span>WhatsApp publico</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, whatsapp: event.target.value } }))}
                    value={form.settings?.whatsapp ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Website</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, websiteUrl: event.target.value } }))}
                    type="url"
                    value={form.settings?.websiteUrl ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Instagram</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, instagramUrl: event.target.value } }))}
                    placeholder="@restaurante"
                    value={form.settings?.instagramUrl ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Logo URL</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, logoUrl: event.target.value } }))}
                    placeholder="https://..."
                    type="url"
                    value={form.settings?.logoUrl ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Imagem de capa URL</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, coverImageUrl: event.target.value } }))}
                    placeholder="https://..."
                    type="url"
                    value={form.settings?.coverImageUrl ?? ""}
                  />
                </div>
              </label>
              <div className="tms-form-section">
                <span className="eyebrow">Matriz</span>
              </div>
              <label className="field">
                <span>Logradouro</span>
                <div>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: { ...current.branch, address: { ...current.branch?.address, street: event.target.value } as NonNullable<TenantCreatePayload["branch"]>["address"] }
                      }))
                    }
                    value={form.branch?.address.street ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Numero</span>
                <div>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: { ...current.branch, address: { ...current.branch?.address, number: event.target.value } as NonNullable<TenantCreatePayload["branch"]>["address"] }
                      }))
                    }
                    value={form.branch?.address.number ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Bairro</span>
                <div>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: { ...current.branch, address: { ...current.branch?.address, district: event.target.value } as NonNullable<TenantCreatePayload["branch"]>["address"] }
                      }))
                    }
                    value={form.branch?.address.district ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>Cidade</span>
                <div>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: { ...current.branch, address: { ...current.branch?.address, city: event.target.value } as NonNullable<TenantCreatePayload["branch"]>["address"] }
                      }))
                    }
                    value={form.branch?.address.city ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>UF</span>
                <div>
                  <input
                    maxLength={2}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: { ...current.branch, address: { ...current.branch?.address, state: event.target.value.toUpperCase() } as NonNullable<TenantCreatePayload["branch"]>["address"] }
                      }))
                    }
                    value={form.branch?.address.state ?? ""}
                  />
                </div>
              </label>
              <label className="field">
                <span>CEP</span>
                <div>
                  <input
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        branch: { ...current.branch, address: { ...current.branch?.address, postalCode: event.target.value } as NonNullable<TenantCreatePayload["branch"]>["address"] }
                      }))
                    }
                    value={form.branch?.address.postalCode ?? ""}
                  />
                </div>
              </label>
              <div className="tms-form-section">
                <span className="eyebrow">Tema</span>
              </div>
              <label className="field">
                <span>Cor primaria</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, primaryColor: event.target.value } }))}
                    type="color"
                    value={form.settings?.primaryColor ?? "#1a6b3b"}
                  />
                </div>
              </label>
              <label className="field">
                <span>Cor secundaria</span>
                <div>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, secondaryColor: event.target.value } }))}
                    type="color"
                    value={form.settings?.secondaryColor ?? "#27ae51"}
                  />
                </div>
              </label>
              <label className="field">
                <span>Mensagem de boas-vindas</span>
                <textarea
                  onChange={(event) => setForm((current) => ({ ...current, settings: { ...current.settings, welcomeMessage: event.target.value } }))}
                  value={form.settings?.welcomeMessage ?? ""}
                />
              </label>
            </div>

            <button className="primary-button" disabled={createMutation.isPending || Boolean(createdInvite)} type="submit">
              {createMutation.isPending ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              Criar tenant
            </button>
          </form>
        </div>
      ) : null}

      {editingTenant ? (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-card tms-create-modal" onSubmit={handleEditSubmit}>
            <header className="modal-header">
              <div>
                <span className="eyebrow">Editar tenant</span>
                <h2>{editingTenant.name}</h2>
              </div>
              <button className="ghost-icon-button" onClick={() => setEditingTenant(null)} type="button">
                <X size={18} /> Fechar
              </button>
            </header>

            <div className="form-grid two-columns">
              <div className="tms-form-section">
                <span className="eyebrow">Empresa</span>
              </div>
              <label className="field">
                <span>Nome comercial</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} value={editForm.name ?? ""} />
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
              <label className="field">
                <span>WhatsApp publico</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, whatsapp: event.target.value } }))} value={editForm.settings?.whatsapp ?? ""} />
                </div>
              </label>
              <div className="tms-form-section">
                <span className="eyebrow">Identidade publica</span>
              </div>
              <label className="field">
                <span>Nome de exibicao</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, brandName: event.target.value } }))} value={editForm.settings?.brandName ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Tipo de negocio</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, businessType: event.target.value } }))} value={editForm.settings?.businessType ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Categoria culinaria</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, cuisineCategory: event.target.value } }))} value={editForm.settings?.cuisineCategory ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Website</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, websiteUrl: event.target.value } }))} type="url" value={editForm.settings?.websiteUrl ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Instagram</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, instagramUrl: event.target.value } }))} value={editForm.settings?.instagramUrl ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Logo URL</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, logoUrl: event.target.value } }))} type="url" value={editForm.settings?.logoUrl ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Imagem de capa URL</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, coverImageUrl: event.target.value } }))} type="url" value={editForm.settings?.coverImageUrl ?? ""} />
                </div>
              </label>
              <label className="field">
                <span>Cor primaria</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, primaryColor: event.target.value } }))} type="color" value={editForm.settings?.primaryColor ?? "#1a6b3b"} />
                </div>
              </label>
              <label className="field">
                <span>Cor secundaria</span>
                <div>
                  <input onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, secondaryColor: event.target.value } }))} type="color" value={editForm.settings?.secondaryColor ?? "#27ae51"} />
                </div>
              </label>
              <label className="field">
                <span>Descricao</span>
                <textarea onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, description: event.target.value } }))} value={editForm.settings?.description ?? ""} />
              </label>
              <label className="field">
                <span>Mensagem de boas-vindas</span>
                <textarea onChange={(event) => setEditForm((current) => ({ ...current, settings: { ...current.settings, welcomeMessage: event.target.value } }))} value={editForm.settings?.welcomeMessage ?? ""} />
              </label>
            </div>

            <button className="primary-button" disabled={updateMutation.isPending} type="submit">
              {updateMutation.isPending ? <Loader2 className="spin" size={18} /> : <Edit3 size={18} />}
              Salvar alteracoes
            </button>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(tenantPendingDelete)}
        title="Deletar tenant"
        description={`Deletar ${tenantPendingDelete?.name ?? "este tenant"} remove o acesso da lista operacional e cancela o ciclo de vida dele.`}
        confirmLabel="Deletar tenant"
        isLoading={deleteMutation.isPending}
        onCancel={() => setTenantPendingDelete(null)}
        onConfirm={() => void confirmDeleteTenant()}
      />
    </section>
  );
}
