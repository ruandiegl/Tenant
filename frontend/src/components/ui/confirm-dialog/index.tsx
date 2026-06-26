import { AlertTriangle, Loader2, LogOut, X } from "lucide-react";
import "./styles.css";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  isLoading = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) return null;
  const Icon = tone === "neutral" ? LogOut : AlertTriangle;

  return (
    <div className="modal-backdrop confirm-dialog-backdrop" role="presentation" onMouseDown={isLoading ? undefined : onCancel}>
      <section
        className="modal-card confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="confirm-dialog-header">
          <span className={`confirm-dialog-mark confirm-dialog-mark-${tone}`} aria-hidden="true">
            <Icon size={20} />
          </span>
          <div>
            <h2 id="confirm-dialog-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button aria-label="Fechar confirmacao" className="ghost-icon-button" disabled={isLoading} onClick={onCancel} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="confirm-dialog-actions">
          <button className="ghost-icon-button" disabled={isLoading} onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className={`confirm-action-button confirm-action-${tone}`} disabled={isLoading} onClick={onConfirm} type="button">
            {isLoading ? <Loader2 className="spin" size={18} /> : null}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
