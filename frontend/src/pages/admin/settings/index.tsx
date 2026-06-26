import "./styles.css";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Image, KeyRound, Loader2, Paintbrush, Percent, Save, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../app/providers/auth-provider";
import { useTenant } from "../../../app/providers/tenant-provider";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { adminService } from "../../../services/admin";
import { authService } from "../../../services/auth";
import { tenantsService } from "../../../services/tenants";
import { formatCurrency } from "../../../utils/format";

export function AdminSettings() {
  const { tenant, settings } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-bundle", tenant.id], queryFn: adminService.getTenantAdminBundle });
  const [form, setForm] = useState({
    name: tenant.name,
    email: tenant.email ?? "",
    phone: tenant.phone ?? "",
    brandName: settings.brandName ?? tenant.name,
    description: settings.description ?? "",
    slogan: settings.slogan ?? "",
    businessType: settings.businessType ?? "",
    cuisineCategory: settings.cuisineCategory ?? "",
    websiteUrl: settings.websiteUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    whatsapp: settings.whatsapp ?? "",
    logoUrl: settings.logoUrl ?? "",
    coverImageUrl: settings.coverImageUrl ?? "",
    primaryColor: settings.primaryColor ?? "#1a6b3b",
    secondaryColor: settings.secondaryColor ?? "#27ae51",
    welcomeMessage: settings.welcomeMessage ?? "",
    minimumOrderValue: String(settings.minimumOrderValue ?? 0),
    defaultPreparationTime: String(settings.defaultPreparationTime ?? 30)
  });
  const [accountForm, setAccountForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    currentPassword: "",
    password: "",
    confirmPassword: ""
  });
  const updateMutation = useMutation({
    mutationFn: tenantsService.updateCurrentTenant,
    onSuccess: async (bundle) => {
      queryClient.setQueryData(["tenant", "current"], bundle);
      toast.success("Configuracoes salvas.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.")
  });
  const accountMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: async (nextUser) => {
      queryClient.setQueryData(["auth", "me"], nextUser);
      setAccountForm((current) => ({ ...current, currentPassword: "", password: "", confirmPassword: "" }));
      toast.success("Conta atualizada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar a conta.")
  });

  useEffect(() => {
    setForm({
      name: tenant.name,
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      brandName: settings.brandName ?? tenant.name,
      description: settings.description ?? "",
      slogan: settings.slogan ?? "",
      businessType: settings.businessType ?? "",
      cuisineCategory: settings.cuisineCategory ?? "",
      websiteUrl: settings.websiteUrl ?? "",
      instagramUrl: settings.instagramUrl ?? "",
      whatsapp: settings.whatsapp ?? "",
      logoUrl: settings.logoUrl ?? "",
      coverImageUrl: settings.coverImageUrl ?? "",
      primaryColor: settings.primaryColor ?? "#1a6b3b",
      secondaryColor: settings.secondaryColor ?? "#27ae51",
      welcomeMessage: settings.welcomeMessage ?? "",
      minimumOrderValue: String(settings.minimumOrderValue ?? 0),
      defaultPreparationTime: String(settings.defaultPreparationTime ?? 30)
    });
  }, [settings, tenant]);

  useEffect(() => {
    setAccountForm((current) => ({
      ...current,
      name: user?.name ?? "",
      email: user?.email ?? ""
    }));
  }, [user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await updateMutation.mutateAsync({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      settings: {
        brandName: form.brandName,
        description: form.description || null,
        slogan: form.slogan || null,
        businessType: form.businessType || null,
        cuisineCategory: form.cuisineCategory || null,
        websiteUrl: form.websiteUrl || null,
        instagramUrl: form.instagramUrl || null,
        whatsapp: form.whatsapp || null,
        logoUrl: form.logoUrl || null,
        coverImageUrl: form.coverImageUrl || null,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        welcomeMessage: form.welcomeMessage || null,
        minimumOrderValue: Number(form.minimumOrderValue || 0),
        defaultPreparationTime: Number(form.defaultPreparationTime || 30)
      }
    });
  };

  const handleAccountSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (accountForm.password && accountForm.password !== accountForm.confirmPassword) {
      toast.error("A nova senha e a confirmacao nao conferem.");
      return;
    }

    await accountMutation.mutateAsync({
      name: accountForm.name,
      email: accountForm.email,
      currentPassword: accountForm.password ? accountForm.currentPassword : undefined,
      password: accountForm.password || undefined
    });
  };

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Tenant"
        title={settings.brandName}
        description="Identidade publica, tema visual e acesso da sua conta."
      />

      <div className="settings-grid">
        <article className="panel identity-panel">
          <img src={form.logoUrl || settings.logoUrl} alt={settings.brandName} />
          <div>
            <h2>{tenant.name}</h2>
            <span>{tenant.slug}</span>
            <StatusBadge status={tenant.status} />
          </div>
        </article>

        <article className="panel settings-preview-panel">
          <div className="settings-cover-preview">
            {form.coverImageUrl ? <img src={form.coverImageUrl} alt="" /> : <Image size={24} />}
          </div>
          <div>
            <span className="eyebrow">Previa visual</span>
            <strong>{form.brandName || tenant.name}</strong>
            <p>{form.slogan || form.welcomeMessage || "A imagem de capa aparece no cardapio publico."}</p>
          </div>
        </article>

        <form className="panel settings-form-panel" onSubmit={handleSubmit}>
          <div className="settings-form-heading">
            <div>
              <h2>Identidade e tema</h2>
              <p className="muted-text">Dados exibidos no painel e base para o cardapio publico.</p>
            </div>
            <Paintbrush size={20} />
          </div>

          <div className="form-grid two-columns">
            <label className="field">
              <span>Nome comercial</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
              </div>
            </label>
            <label className="field">
              <span>Nome de exibicao</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))} value={form.brandName} />
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
              <span>WhatsApp</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} value={form.whatsapp} />
              </div>
            </label>
            <label className="field">
              <span>Logo URL</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} type="url" value={form.logoUrl} />
              </div>
            </label>
            <label className="field">
              <span>Imagem de capa URL</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, coverImageUrl: event.target.value }))} type="url" value={form.coverImageUrl} />
              </div>
            </label>
            <label className="field">
              <span>Tipo de negocio</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, businessType: event.target.value }))} value={form.businessType} />
              </div>
            </label>
            <label className="field">
              <span>Categoria culinaria</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, cuisineCategory: event.target.value }))} value={form.cuisineCategory} />
              </div>
            </label>
            <label className="field">
              <span>Slogan</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, slogan: event.target.value }))} value={form.slogan} />
              </div>
            </label>
            <label className="field">
              <span>Website</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} type="url" value={form.websiteUrl} />
              </div>
            </label>
            <label className="field">
              <span>Instagram</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, instagramUrl: event.target.value }))} value={form.instagramUrl} />
              </div>
            </label>
            <label className="field">
              <span>Cor primaria</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))} type="color" value={form.primaryColor} />
              </div>
            </label>
            <label className="field">
              <span>Cor secundaria</span>
              <div>
                <input onChange={(event) => setForm((current) => ({ ...current, secondaryColor: event.target.value }))} type="color" value={form.secondaryColor} />
              </div>
            </label>
            <label className="field">
              <span>Pedido minimo</span>
              <div>
                <input min="0" onChange={(event) => setForm((current) => ({ ...current, minimumOrderValue: event.target.value }))} type="number" value={form.minimumOrderValue} />
              </div>
            </label>
            <label className="field">
              <span>Preparo padrao</span>
              <div>
                <input min="1" onChange={(event) => setForm((current) => ({ ...current, defaultPreparationTime: event.target.value }))} type="number" value={form.defaultPreparationTime} />
              </div>
            </label>
            <label className="field">
              <span>Descricao</span>
              <textarea onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} value={form.description} />
            </label>
            <label className="field">
              <span>Mensagem de boas-vindas</span>
              <textarea onChange={(event) => setForm((current) => ({ ...current, welcomeMessage: event.target.value }))} value={form.welcomeMessage} />
            </label>
          </div>

          <button className="primary-button" disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            Salvar configuracoes
          </button>
        </form>

        <form className="panel settings-account-panel" onSubmit={handleAccountSubmit}>
          <div className="settings-form-heading">
            <div>
              <h2>Minha conta</h2>
              <p className="muted-text">Altere o email de acesso ou defina uma nova senha.</p>
            </div>
            <KeyRound size={20} />
          </div>
          <div className="form-grid two-columns">
            <label className="field">
              <span>Nome</span>
              <div>
                <input onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} value={accountForm.name} />
              </div>
            </label>
            <label className="field">
              <span>Email de acesso</span>
              <div>
                <input onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} type="email" value={accountForm.email} />
              </div>
            </label>
            <label className="field">
              <span>Senha atual</span>
              <div>
                <input onChange={(event) => setAccountForm((current) => ({ ...current, currentPassword: event.target.value }))} type="password" value={accountForm.currentPassword} />
              </div>
            </label>
            <label className="field">
              <span>Nova senha</span>
              <div>
                <input minLength={8} onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))} type="password" value={accountForm.password} />
              </div>
            </label>
            <label className="field">
              <span>Confirmar senha</span>
              <div>
                <input minLength={8} onChange={(event) => setAccountForm((current) => ({ ...current, confirmPassword: event.target.value }))} type="password" value={accountForm.confirmPassword} />
              </div>
            </label>
          </div>
          <button className="primary-button" disabled={accountMutation.isPending} type="submit">
            {accountMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            Salvar conta
          </button>
        </form>

        <article className="panel">
          <h2>Regras de pedido</h2>
          <div className="option-row selected">
            <ShieldCheck size={18} />
            <span>Checkout convidado {settings.allowGuestCheckout ? "ativo" : "inativo"}</span>
          </div>
          <div className="option-row">
            <Percent size={18} />
            <span>Pedido minimo {formatCurrency(settings.minimumOrderValue)}</span>
          </div>
        </article>

        <article className="panel">
          <h2>Filiais</h2>
          {data?.branches.map((branch) => (
            <div className="rank-row" key={branch.id}>
              <div>
                <strong>{branch.name}</strong>
                <span>{branch.acceptsDelivery ? "Entrega" : "Sem entrega"} + Retirada</span>
              </div>
              <Building2 size={18} />
            </div>
          ))}
        </article>

        <article className="panel">
          <h2>Cupons</h2>
          {data?.coupons.map((coupon) => (
            <div className="rank-row" key={coupon.id}>
              <div>
                <strong>{coupon.code}</strong>
                <span>{coupon.description}</span>
              </div>
              <StatusBadge status={coupon.status} />
            </div>
          ))}
        </article>
      </div>

    </section>
  );
}

