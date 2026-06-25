import "./styles.css";
import { UsageResource } from "../../../services/tenant-management";

type UsageBarProps = {
  label: string;
  usage: UsageResource;
};

export function UsageBar({ label, usage }: UsageBarProps) {
  const percent = usage.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const tone = usage.limit && percent >= 80 ? "warning" : "normal";

  return (
    <div className={`usage-bar usage-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{usage.limit === null ? `${usage.used}/Ilimitado` : `${usage.used}/${usage.limit}`}</strong>
      </div>
      <meter min={0} max={100} value={usage.limit === null ? 100 : percent} aria-label={`${label}: ${percent}% usado`} />
    </div>
  );
}
