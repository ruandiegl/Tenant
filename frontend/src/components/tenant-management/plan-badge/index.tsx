import "./styles.css";
import { Crown, Gauge, Rocket, Sprout } from "lucide-react";
import { PlanName } from "../../../services/tenant-management";

const planMeta: Record<PlanName, { label: string; icon: typeof Sprout }> = {
  TRIAL: { label: "Trial", icon: Sprout },
  BASIC: { label: "Basic", icon: Gauge },
  PRO: { label: "Pro", icon: Rocket },
  ENTERPRISE: { label: "Enterprise", icon: Crown }
};

export function PlanBadge({ plan }: { plan: string }) {
  const normalized = plan.toUpperCase() as PlanName;
  const meta = planMeta[normalized] ?? planMeta.BASIC;
  const Icon = meta.icon;

  return (
    <span className={`plan-badge plan-${normalized.toLowerCase()}`}>
      <Icon size={14} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
