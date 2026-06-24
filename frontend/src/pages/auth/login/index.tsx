import "./styles.css";
import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Store } from "lucide-react";
import { BrandLogo } from "../../../components/brand-logo";
import { useAuth } from "../../../app/providers/auth-provider";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.VITE_DEMO_EMAIL ?? "admin@demo.local");
  const [password, setPassword] = useState(import.meta.env.VITE_DEMO_PASSWORD ?? "admin123");
  const [tenantSlug, setTenantSlug] = useState(import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password, tenantSlug });
      navigate("/admin", { replace: true });
    } catch {
      setError("Nao foi possivel entrar. Confira email, senha e tenant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-screen">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-brand-lockup">
            <BrandLogo compact className="auth-mark" />
            <div>
              <span>Painel administrativo</span>
              <strong>podePedir</strong>
            </div>
          </div>

          <div className="auth-hero-copy">
            <span>Operacao de restaurantes</span>
            <h1>
              Controle de pedidos, cozinha e <strong>cardapio</strong>
            </h1>
            <p>Gerencie atendimento, preparo e produtos do tenant em um so lugar.</p>
          </div>
        </div>

        <form className="auth-panel" onSubmit={handleSubmit}>
          <div className="auth-panel-heading">
            <span className="eyebrow">Acesso</span>
            <h2>Entrar no painel</h2>
            <p>Use suas credenciais do tenant.</p>
          </div>

          <label className="field auth-field">
            <span>Email</span>
            <div>
              <Mail size={18} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </div>
          </label>

          <label className="field auth-field">
            <span>Senha</span>
            <div>
              <Lock size={18} />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
              />
              <button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="field auth-field">
            <span>Tenant</span>
            <div>
              <Store size={18} />
              <input value={tenantSlug} onChange={(event) => setTenantSlug(event.target.value)} autoComplete="organization" />
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            Entrar com email e senha
          </button>

          <p className="auth-help">
            Problemas de acesso? <a href="mailto:suporte@podepedir.local">Falar com suporte</a>
          </p>

          <small className="auth-footnote">© 2026 podePedir</small>
        </form>
      </div>
    </section>
  );
}

