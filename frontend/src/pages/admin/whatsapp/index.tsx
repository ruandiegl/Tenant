import "./styles.css";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, MessageCircle, QrCode, RefreshCw, RotateCcw, Save, Send, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "react-toastify";
import { useTenant } from "../../../app/providers/tenant-provider";
import { PageHeader } from "../../../components/ui/page-header";
import { whatsappService } from "../../../services/whatsapp";
import { WhatsappMessageTemplate } from "../../../types/database";

type TemplateDraft = {
  title: string;
  body: string;
  enabled: boolean;
};

const triggerLabels: Record<string, string> = {
  WELCOME: "Nova conversa",
  ORDER_PLACED: "Pedido recebido",
  ORDER_ACCEPTED: "Pedido aceito",
  ORDER_PREPARING: "Em preparo",
  ORDER_READY: "Pedido pronto",
  ORDER_DISPATCHED: "Saiu para entrega",
  ORDER_DELIVERED: "Entregue",
  ORDER_COMPLETED: "Concluido",
  ORDER_CANCELLED: "Cancelado",
  ORDER_REJECTED: "Recusado"
};

export function AdminWhatsapp() {
  const { tenant, settings } = useTenant();
  const queryClient = useQueryClient();
  const whatsappQuery = useQuery({
    queryKey: ["tenant-whatsapp-session", tenant.id],
    queryFn: whatsappService.getSession,
    refetchInterval: (query) => (query.state.data?.status === "PENDING_QR" ? 10_000 : false)
  });
  const templatesQuery = useQuery({
    enabled: Boolean(whatsappQuery.data),
    queryKey: ["tenant-whatsapp-templates", tenant.id],
    queryFn: whatsappService.listTemplates
  });
  const [whatsappForm, setWhatsappForm] = useState({
    phone: settings.whatsapp ?? "",
    message: "Mensagem de teste do podePedir."
  });
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, TemplateDraft>>({});

  const whatsappStartMutation = useMutation({
    mutationFn: whatsappService.createOrStartSession,
    onSuccess: async (session) => {
      queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], session);
      await queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-templates", tenant.id] });
      toast.success("Sessao WhatsApp criada. Leia o QR Code para conectar.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel iniciar o WhatsApp.")
  });
  const whatsappQrMutation = useMutation({
    mutationFn: whatsappService.refreshQr,
    onSuccess: (session) => {
      queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], session);
      toast.success("QR Code atualizado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar o QR Code.")
  });
  const whatsappStopMutation = useMutation({
    mutationFn: whatsappService.stopSession,
    onSuccess: async (session) => {
      queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], session);
      await queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-templates", tenant.id] });
      toast.success("WhatsApp desconectado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel desconectar o WhatsApp.")
  });
  const whatsappSettingsMutation = useMutation({
    mutationFn: whatsappService.updateSettings,
    onSuccess: (session) => {
      queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], session);
      toast.success("Preferencias do bot salvas.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar as preferencias.")
  });
  const whatsappTestMutation = useMutation({
    mutationFn: whatsappService.sendTestMessage,
    onSuccess: () => toast.success("Mensagem de teste enviada."),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar a mensagem.")
  });
  const templateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TemplateDraft }) => whatsappService.updateTemplate(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-templates", tenant.id] });
      toast.success("Mensagem salva.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a mensagem.")
  });
  const templateDeleteMutation = useMutation({
    mutationFn: whatsappService.deleteTemplate,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-templates", tenant.id] });
      toast.success("Mensagem removida do envio automatico.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel remover a mensagem.")
  });

  useEffect(() => {
    setWhatsappForm((current) => ({
      ...current,
      phone: settings.whatsapp ?? current.phone
    }));
  }, [settings.whatsapp]);

  useEffect(() => {
    if (!templatesQuery.data) return;

    setTemplateDrafts((current) => {
      const next = { ...current };

      for (const template of templatesQuery.data) {
        next[template.id] = next[template.id] ?? {
          title: template.title,
          body: template.body,
          enabled: template.enabled
        };
      }

      return next;
    });
  }, [templatesQuery.data]);

  const whatsappSession = whatsappQuery.data;
  const whatsappConnected = whatsappSession?.status === "CONNECTED";
  const whatsappBusy =
    whatsappStartMutation.isPending ||
    whatsappQrMutation.isPending ||
    whatsappStopMutation.isPending ||
    whatsappSettingsMutation.isPending ||
    whatsappTestMutation.isPending;

  const handleWhatsappSettingsSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!whatsappSession) return;

    await whatsappSettingsMutation.mutateAsync({
      autoReplyEnabled: whatsappSession.autoReplyEnabled,
      notifyOrderStatus: whatsappSession.notifyOrderStatus
    });
  };

  const handleWhatsappTestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await whatsappTestMutation.mutateAsync(whatsappForm);
  };

  const updateTemplateDraft = (template: WhatsappMessageTemplate, patch: Partial<TemplateDraft>) => {
    setTemplateDrafts((current) => ({
      ...current,
      [template.id]: {
        title: current[template.id]?.title ?? template.title,
        body: current[template.id]?.body ?? template.body,
        enabled: current[template.id]?.enabled ?? template.enabled,
        ...patch
      }
    }));
  };

  const saveTemplate = (template: WhatsappMessageTemplate) => {
    const draft = templateDrafts[template.id];

    if (!draft) return;

    templateMutation.mutate({ id: template.id, payload: draft });
  };

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Atendimento"
        title="WhatsApp"
        description="Conecte o numero do restaurante para respostas automaticas e avisos de pedido."
        actions={whatsappConnected ? <span className="connection">Conectado</span> : <span className="connection">Aguardando conexao</span>}
      />

      <div className="whatsapp-grid">
        <article className="panel whatsapp-panel">
          <div className="whatsapp-heading">
            <div>
              <h2>Sessao</h2>
              <p className="muted-text">Use o QR Code para autenticar a conta do restaurante.</p>
            </div>
            {whatsappConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>

          <div className={`whatsapp-status ${whatsappConnected ? "connected" : ""}`}>
            <div>
              <span>Status</span>
              <strong>{whatsappQuery.isLoading ? "Carregando" : whatsappSession?.status ?? "Nao configurado"}</strong>
            </div>
            {whatsappSession?.sessionName && <code>{whatsappSession.sessionName}</code>}
          </div>

          {whatsappSession?.lastError && <p className="form-error">{whatsappSession.lastError}</p>}

          {whatsappSession?.qrCode ? (
            <div className="whatsapp-qr">
              <img src={whatsappSession.qrCode} alt="QR Code para conectar WhatsApp" />
            </div>
          ) : (
            <div className="whatsapp-qr empty">
              <QrCode size={34} />
            </div>
          )}

          <div className="whatsapp-actions">
            <button className="primary-button" disabled={whatsappBusy} onClick={() => whatsappStartMutation.mutate()} type="button">
              {whatsappStartMutation.isPending ? <Loader2 className="spin" size={18} /> : <MessageCircle size={18} />}
              {whatsappSession ? "Reconectar" : "Criar sessao"}
            </button>
            <button className="ghost-icon-button" disabled={!whatsappSession || whatsappBusy} onClick={() => whatsappQrMutation.mutate()} type="button">
              {whatsappQrMutation.isPending ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
              Atualizar QR
            </button>
            <button className="ghost-icon-button" disabled={!whatsappSession || whatsappBusy} onClick={() => whatsappStopMutation.mutate()} type="button">
              <WifiOff size={18} />
              Desconectar
            </button>
          </div>
        </article>

        <article className="panel whatsapp-panel">
          <div className="whatsapp-heading">
            <div>
              <h2>Bot e notificacoes</h2>
              <p className="muted-text">Defina como o app conversa com clientes durante o pedido.</p>
            </div>
            <MessageCircle size={20} />
          </div>

          {whatsappSession ? (
            <form className="whatsapp-settings" onSubmit={handleWhatsappSettingsSubmit}>
              <label className="toggle-row">
                <input
                  checked={whatsappSession.autoReplyEnabled}
                  onChange={(event) =>
                    queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], {
                      ...whatsappSession,
                      autoReplyEnabled: event.target.checked
                    })
                  }
                  type="checkbox"
                />
                <span>Responder automaticamente novas mensagens</span>
              </label>
              <label className="toggle-row">
                <input
                  checked={whatsappSession.notifyOrderStatus}
                  onChange={(event) =>
                    queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], {
                      ...whatsappSession,
                      notifyOrderStatus: event.target.checked
                    })
                  }
                  type="checkbox"
                />
                <span>Enviar avisos quando o status do pedido mudar</span>
              </label>
              <button className="primary-button" disabled={whatsappSettingsMutation.isPending} type="submit">
                {whatsappSettingsMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                Salvar preferencias
              </button>
            </form>
          ) : (
            <div className="whatsapp-empty">
              <QrCode size={28} />
              <strong>Crie uma sessao para configurar o bot</strong>
              <span>As preferencias ficam disponiveis depois que o tenant tiver uma sessao.</span>
            </div>
          )}
        </article>

        <article className="panel whatsapp-templates-panel">
          <div className="whatsapp-heading">
            <div>
              <h2>Mensagens automaticas</h2>
              <p className="muted-text">Edite o texto enviado em cada momento do atendimento e do pedido.</p>
            </div>
            <FileText size={20} />
          </div>

          <div className="template-token-row">
            <code>{"{restaurante}"}</code>
            <code>{"{cardapio}"}</code>
            <code>{"{codigo}"}</code>
            <code>{"{rastreamento}"}</code>
            <code>{"{total}"}</code>
          </div>

          {templatesQuery.isLoading ? (
            <div className="whatsapp-empty">
              <Loader2 className="spin" size={24} />
              <strong>Carregando mensagens</strong>
            </div>
          ) : templatesQuery.data?.length ? (
            <div className="template-list">
              {templatesQuery.data.map((template) => {
                const draft = templateDrafts[template.id] ?? {
                  title: template.title,
                  body: template.body,
                  enabled: template.enabled
                };

                return (
                  <section className={`template-editor ${draft.enabled ? "" : "disabled"}`} key={template.id}>
                    <div className="template-editor-head">
                      <div>
                        <span>{triggerLabels[template.trigger] ?? template.trigger}</span>
                        <input
                          onChange={(event) => updateTemplateDraft(template, { title: event.target.value })}
                          value={draft.title}
                        />
                      </div>
                      <label className="template-enabled">
                        <input
                          checked={draft.enabled}
                          onChange={(event) => updateTemplateDraft(template, { enabled: event.target.checked })}
                          type="checkbox"
                        />
                        <span>{draft.enabled ? "Ativa" : "Inativa"}</span>
                      </label>
                    </div>
                    <textarea
                      onChange={(event) => updateTemplateDraft(template, { body: event.target.value })}
                      value={draft.body}
                    />
                    <div className="template-actions">
                      <button className="ghost-icon-button" disabled={templateMutation.isPending} onClick={() => saveTemplate(template)} type="button">
                        {templateMutation.isPending ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                        Salvar
                      </button>
                      {draft.enabled ? (
                        <button className="ghost-icon-button danger-action" disabled={templateDeleteMutation.isPending} onClick={() => templateDeleteMutation.mutate(template.id)} type="button">
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      ) : (
                        <button className="ghost-icon-button" disabled={templateMutation.isPending} onClick={() => templateMutation.mutate({ id: template.id, payload: { ...draft, enabled: true } })} type="button">
                          <RotateCcw size={16} />
                          Reativar
                        </button>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="whatsapp-empty">
              <QrCode size={28} />
              <strong>Crie uma sessao para editar mensagens</strong>
              <span>Os modelos aparecem depois que o tenant tiver uma sessao WhatsApp.</span>
            </div>
          )}
        </article>

        <form className="panel whatsapp-test" onSubmit={handleWhatsappTestSubmit}>
          <h2>Teste de envio</h2>
          <label className="field">
            <span>Telefone para teste</span>
            <div>
              <input onChange={(event) => setWhatsappForm((current) => ({ ...current, phone: event.target.value }))} value={whatsappForm.phone} />
            </div>
          </label>
          <label className="field">
            <span>Mensagem</span>
            <textarea onChange={(event) => setWhatsappForm((current) => ({ ...current, message: event.target.value }))} value={whatsappForm.message} />
          </label>
          <button className="primary-button" disabled={!whatsappConnected || whatsappTestMutation.isPending} type="submit">
            {whatsappTestMutation.isPending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Enviar teste
          </button>
        </form>
      </div>
    </section>
  );
}
