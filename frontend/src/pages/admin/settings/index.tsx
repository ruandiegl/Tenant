import "./styles.css";
import { useQuery } from "@tanstack/react-query";
import { Building2, Percent, ShieldCheck } from "lucide-react";
import { useTenant } from "../../../app/providers/tenant-provider";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { adminService } from "../../../services/admin";
import { formatCurrency } from "../../../utils/format";

export function AdminSettings() {
  const { tenant, settings } = useTenant();
  const { data } = useQuery({ queryKey: ["admin-bundle"], queryFn: adminService.getTenantAdminBundle });

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Tenant"
        title={settings.brandName}
        description="Configuracoes operacionais preparadas para TenantSettings, Branch e Coupon."
      />

      <div className="settings-grid">
        <article className="panel identity-panel">
          <img src={settings.logoUrl} alt={settings.brandName} />
          <div>
            <h2>{tenant.name}</h2>
            <span>{tenant.slug}</span>
            <StatusBadge status={tenant.status} />
          </div>
        </article>

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

