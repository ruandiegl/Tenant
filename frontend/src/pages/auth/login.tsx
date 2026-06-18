import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, Store, Utensils } from "lucide-react";
import { BrandLogo } from "../../components/brand-logo";
import { useAuth } from "../../app/providers/auth-provider";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.VITE_DEMO_EMAIL ?? "admin@demo.local");
  const [password, setPassword] = useState(import.meta.env.VITE_DEMO_PASSWORD ?? "admin123");
  const [tenantSlug, setTenantSlug] = useState(import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/cliente" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password, tenantSlug });
      navigate("/cliente", { replace: true });
    } catch {
      setError("Nao foi possivel entrar. Confira email, senha e tenant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-screen">
      <div className="auth-hero">
        <div className="auth-brand">
          <BrandLogo className="auth-logo" />
          <h1>Entre para gerenciar pedidos, cozinha e cardapio.</h1>
          <p>Autenticacao inicial com JWT da API. A entrada com Google via Clerk entra nesta mesma tela na proxima etapa.</p>
        </div>
      </div>

      <form className="auth-panel" onSubmit={handleSubmit}>
        <div>
          <span className="eyebrow">Acesso</span>
          <h2>Entrar no tenant</h2>
        </div>

        <label className="field">
          <span>Email</span>
          <div>
            <Mail size={18} />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
          </div>
        </label>

        <label className="field">
          <span>Senha</span>
          <div>
            <Lock size={18} />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </div>
        </label>

        <label className="field">
          <span>Tenant slug</span>
          <div>
            <Store size={18} />
            <input value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} autoComplete="organization" />
          </div>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? <Loader2 className="spin" size={18} /> : <Utensils size={18} />}
          Entrar
        </button>
      </form>
    </section>
  );
}
