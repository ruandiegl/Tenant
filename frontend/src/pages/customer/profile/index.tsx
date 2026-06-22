import "./styles.css";
import { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, UserRound } from "lucide-react";
import { useCustomerFlow } from "../../../app/providers/customer-flow-provider";
import { PageHeader } from "../../../components/ui/page-header";

export function CustomerProfile() {
  const { profile, updateProfile } = useCustomerFlow();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfile({ wantsAccount: true });
  };

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Perfil"
        title="Conta opcional"
        description="O cliente pode pedir como convidado. Criar conta serve apenas para agilizar proximos pedidos."
      />

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Nome</span>
          <div>
            <UserRound size={18} />
            <input value={profile.name} onChange={(event) => updateProfile({ name: event.target.value })} placeholder="Seu nome" />
          </div>
        </label>

        <label className="field">
          <span>Email</span>
          <div>
            <Mail size={18} />
            <input
              value={profile.email}
              onChange={(event) => updateProfile({ email: event.target.value })}
              placeholder="voce@email.com"
              type="email"
            />
          </div>
        </label>

        <label className="field">
          <span>WhatsApp</span>
          <div>
            <Phone size={18} />
            <input value={profile.phone} onChange={(event) => updateProfile({ phone: event.target.value })} placeholder="(11) 90000-0000" />
          </div>
        </label>

        <button className="primary-button" type="submit">
          Salvar perfil opcional
        </button>
      </form>

      <article className="panel">
        <h2>Sem conta tambem funciona</h2>
        <p className="muted-text">
          Para finalizar como convidado, basta preencher endereco e pagamento no carrinho. A conta pode ficar para depois.
        </p>
        <Link className="wide-link" to="/cliente/carrinho">
          Ir para o carrinho
        </Link>
      </article>
    </section>
  );
}

