import "./styles.css";
import { CSSProperties, FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, UserRound } from "lucide-react";
import { BrandLogo } from "../../../components/brand-logo";
import { publicInviteService } from "../../../services/auth";

export function AcceptInvitePage() {
  const { token = "" } = useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: invite, isError, isLoading } = useQuery({
    queryKey: ["invite", token],
    queryFn: () => publicInviteService.getInvite(token),
    retry: false,
    enabled: Boolean(token)
  });
  const accentStyle = useMemo(
    () =>
      ({
        "--invite-primary": invite?.tenant.primaryColor ?? "#1a6b3b",
        "--invite-secondary": invite?.tenant.secondaryColor ?? "#27ae51"
      }) as CSSProperties,
    [invite]
  );

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setIsSubmitting(true);

    try {
      await publicInviteService.acceptInvite({ token, password, name: name || undefined });
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      await queryClient.invalidateQueries({ queryKey: ["tenant", "current"] });
      window.location.assign("/admin");
    } catch {
      setError("Nao foi possivel aceitar o convite. Verifique se o link ainda e valido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="invite-screen" style={accentStyle}>
      <div className="invite-shell">
        <aside className="invite-side">
          <BrandLogo compact className="invite-logo" />
          <div>
            <span>Convite PodePedir</span>
            <h1>{invite?.tenant.brandName ?? "Restaurante"}</h1>
            <p>Defina sua senha para acessar o painel administrativo deste tenant.</p>
          </div>
        </aside>

        <form className="invite-panel" onSubmit={handleSubmit}>
          {isLoading ? (
            <div className="empty-state">
              <Loader2 className="spin" size={28} />
              <p>Validando convite...</p>
            </div>
          ) : null}

          {isError ? (
            <div className="empty-state">
              <ShieldCheck size={30} />
              <p>Este convite expirou ou ja foi usado.</p>
            </div>
          ) : null}

          {invite ? (
            <>
              <div className="invite-heading">
                <span className="eyebrow">Acesso do tenant</span>
                <h2>Criar senha</h2>
                <p>
                  {invite.email} - {invite.role}
                </p>
              </div>

              <label className="field auth-field">
                <span>Seu nome</span>
                <div>
                  <UserRound size={18} />
                  <input onChange={(event) => setName(event.target.value)} placeholder="Nome exibido no painel" value={name} />
                </div>
              </label>

              <label className="field auth-field">
                <span>Senha</span>
                <div>
                  <Lock size={18} />
                  <input
                    minLength={8}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
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
                <span>Confirmar senha</span>
                <div>
                  <Lock size={18} />
                  <input minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
                </div>
              </label>

              {error ? <p className="form-error">{error}</p> : null}

              <button className="primary-button invite-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
                Ativar acesso
              </button>
            </>
          ) : null}
        </form>
      </div>
    </section>
  );
}
