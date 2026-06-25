import "../styles.css";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import { PageHeader } from "../../../components/ui/page-header";
import { tenantManagementService } from "../../../services/tenant-management";

export function SuperAdminAuditLogs() {
  const [action, setAction] = useState("");
  const { data } = useQuery({
    queryKey: ["tenant-management", "audit", action],
    queryFn: () => tenantManagementService.listAuditLogs({ page: 1, pageSize: 50, action })
  });
  const logs = data?.data ?? [];

  return (
    <section className="screen tms-screen">
      <PageHeader
        eyebrow="Superadmin"
        title="Auditoria global"
        description="Eventos relevantes de ciclo de vida, plano e configuracoes dos tenants."
      />

      <div className="tms-filter-bar">
        <label className="field">
          <span>Filtrar por acao</span>
          <div>
            <Search size={17} aria-hidden="true" />
            <input onChange={(event) => setAction(event.target.value)} placeholder="tenant.created" value={action} />
          </div>
        </label>
      </div>

      <article className="panel tms-table-panel">
        <div className="tms-audit-list tms-audit-list-large">
          {logs.map((log) => (
            <div key={log.id}>
              <time>{new Date(log.createdAt).toLocaleString("pt-BR")}</time>
              <strong>{log.action}</strong>
              <span>{log.user?.name ?? "Sistema"} - {log.entity}</span>
            </div>
          ))}
          {logs.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={30} />
              <p>Nenhum log encontrado.</p>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
