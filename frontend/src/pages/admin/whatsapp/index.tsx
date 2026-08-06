import "./styles.css";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, KeyRound, Loader2, MessageCircle, RotateCcw, Save, Send, ShieldCheck, Trash2, Wifi, WifiOff } from "lucide-react";
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

const sessionStatusLabels: Record<string, string> = {
  CONNECTING: "Conectando",
  PENDING_PAIRING_CODE: "Aguardando codigo",
  CONNECTED: "Conectado",
  RECONNECTING: "Reconectando",
  DISCONNECTED: "Desconectado",
  LOGGED_OUT: "Desconectado pelo celular",
  ERROR: "Erro de Conexao"
};

const shouldPollSession = (status?: string) =>
  status ? ["CONNECTING", "PENDING_PAIRING_CODE", "RECONNECTING"].includes(status) : false;

export function AdminWhatsapp() {
  const { tenant, settings } = useTenant();
  const queryClient = useQueryClient();
  const whatsappQuery = useQuery({
    queryKey: ["tenant-whatsapp-session", tenant.id],
    queryFn: whatsappService.getSession,
    refetchInterval: (query) => (shouldPollSession(query.state.data?.status) ? 4_000 : false)
  });
  const templatesQuery = useQuery({
    enabled: Boolean(whatsappQuery.data),
    queryKey: ["tenant-whatsapp-templates", tenant.id],
    queryFn: whatsappService.listTemplates
  });
  const [whatsappForm, setWhatsappForm] = useState({
    phone: settings.whatsapp ?? "",
    message: "Mensagem de teste do PodePedir."
  });
  const [pairingPhone, setPairingPhone] = useState(settings.whatsapp ?? "");
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, TemplateDraft>>({});

  const whatsappStartMutation = useMutation({
    mutationFn: whatsappService.createOrStartSession,
    onSuccess: async (session) => {
      queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], session);
      await queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-templates", tenant.id] });
      toast.success("Sessao WhatsApp Baileys iniciada. Informe o numero do WhatsApp para gerar o codigo de pareamento.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel iniciar a sessao.")
  });

  const whatsappPairingMutation = useMutation({
    mutationFn: (phoneNumber: string) => whatsappService.requestPairingCode(phoneNumber),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-session", tenant.id] });
      toast.success(`Codigo gerado com sucesso: ${data.pairingCode}`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel gerar o codigo.")
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
    onSuccess: () => toast.success("Mensagem de teste enviada com sucesso!"),
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar a mensagem de teste.")
  });

  const templateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TemplateDraft }) => whatsappService.updateTemplate(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-templates", tenant.id] });
      toast.success("Modelo de mensagem salvo.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a mensagem.")
  });

  const templateDeleteMutation = useMutation({
    mutationFn: whatsappService.deleteTemplate,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tenant-whatsapp-templates", tenant.id] });
      toast.success("Mensagem desativada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Nao foi possivel desativar a mensagem.")
  });

  useEffect(() => {
    setWhatsappForm((current) => ({
      ...current,
      phone: settings.whatsapp ?? current.phone
    }));
    setPairingPhone((current) => settings.whatsapp ?? current);
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
    whatsappPairingMutation.isPending ||
    whatsappStopMutation.isPending ||
    whatsappSettingsMutation.isPending ||
    whatsappTestMutation.isPending;

  const copyPairingCode = () => {
    if (whatsappSession?.pairingCode) {
      navigator.clipboard.writeText(whatsappSession.pairingCode.replace("-", ""));
      toast.info("Codigo copiado para a area de transferencia!");
    }
  };

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
        eyebrow="Atendimento Automatico"
        title="WhatsApp Bot (Baileys Nativo)"
        description="Conecte seu WhatsApp sem precisar de QR Code, utilizando o codigo de pareamento direto de 8 digitos."
        actions={
          whatsappConnected ? (
            <span className="badge connected">
              <ShieldCheck size={16} /> Conectado
            </span>
          ) : (
            <span className="badge disconnected">
              <WifiOff size={16} /> Desconectado
            </span>
          )
        }
      />

      <div className="whatsapp-grid">
        <article className="panel whatsapp-panel">
          <div className="whatsapp-heading">
            <div>
              <h2>Conexao por Pairing Code</h2>
              <p className="muted-text">
                Insira o numero do WhatsApp do restaurante (com DDD) para solicitar o codigo de pareamento de 8 digitos.
              </p>
            </div>
            {whatsappConnected ? <Wifi size={22} className="text-success" /> : <WifiOff size={22} className="text-muted" />}
          </div>

          <div className={`whatsapp-status ${whatsappConnected ? "connected" : ""}`}>
            <div>
              <span>Status da Conexao:</span>
              <strong>{whatsappQuery.isLoading ? "Verificando..." : sessionStatusLabels[whatsappSession?.status ?? ""] ?? "Nao configurado"}</strong>
            </div>
            {whatsappSession?.phoneNumber && <code>+{whatsappSession.phoneNumber}</code>}
          </div>

          {whatsappSession?.lastError && <p className="form-error">{whatsappSession.lastError}</p>}

          {!whatsappConnected && (
            <div className="pairing-code-box">
              <label className="field">
                <span>Numero do WhatsApp (com DDD)</span>
                <div>
                  <input
                    placeholder="Ex: 11999998888"
                    onChange={(event) => setPairingPhone(event.target.value)}
                    value={pairingPhone}
                  />
                </div>
              </label>

              {whatsappSession?.pairingCode && (
                <div className="pairing-code-card">
                  <span>Seu Codigo de Pareamento:</span>
                  <div className="pairing-code-display" onClick={copyPairingCode}>
                    <strong>{whatsappSession.pairingCode}</strong>
                    <button type="button" className="icon-only-button" title="Copiar Codigo">
                      <Copy size={18} />
                    </button>
                  </div>
                  <div className="pairing-instructions">
                    <p><strong>Passo a passo no seu celular:</strong></p>
                    <ol>
                      <li>Abra o <strong>WhatsApp</strong> no celular do restaurante</li>
                      <li>Toque em <strong>Configuracoes</strong> ou nos tres pontos &gt; <strong>Dispositivos Conectados</strong></li>
                      <li>Toque em <strong>Vincular um dispositivo</strong></li>
                      <li>Selecione <strong>Conectar com numero de telefone</strong> abaixo do scanner</li>
                      <li>Digite o codigo de 8 digitos acima</li>
                    </ol>
                  </div>
                </div>
              )}

              <button
                className="primary-button full-width"
                disabled={whatsappBusy || !pairingPhone}
                onClick={() => whatsappPairingMutation.mutate(pairingPhone)}
                type="button"
              >
                {whatsappPairingMutation.isPending ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
                Gerar Codigo de Pareamento (8 digitos)
              </button>
            </div>
          )}

          <div className="whatsapp-actions">
            {!whatsappSession && (
              <button className="primary-button" disabled={whatsappBusy} onClick={() => whatsappStartMutation.mutate()} type="button">
                {whatsappStartMutation.isPending ? <Loader2 className="spin" size={18} /> : <MessageCircle size={18} />}
                Iniciar Nova Sessao
              </button>
            )}
            {whatsappSession && (
              <button className="ghost-icon-button danger-action" disabled={whatsappBusy} onClick={() => whatsappStopMutation.mutate()} type="button">
                <WifiOff size={18} />
                Desconectar WhatsApp
              </button>
            )}
          </div>
        </article>

        <article className="panel whatsapp-panel">
          <div className="whatsapp-heading">
            <div>
              <h2>Preferencias do Bot</h2>
              <p className="muted-text">Ative ou desative as automacoes de atendimento.</p>
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
                <span>Responder automaticamente com mensagem de boas-vindas</span>
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
                <span>Notificar cliente via WhatsApp quando o status do pedido mudar</span>
              </label>
              <button className="primary-button" disabled={whatsappSettingsMutation.isPending} type="submit">
                {whatsappSettingsMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                Salvar Preferencias
              </button>
            </form>
          ) : (
            <div className="whatsapp-empty">
              <MessageCircle size={28} />
              <strong>Inicie a sessao para configurar o bot</strong>
            </div>
          )}
        </article>

        <article className="panel whatsapp-templates-panel">
          <div className="whatsapp-heading">
            <div>
              <h2>Modelos de Mensagens</h2>
              <p className="muted-text">Personalize o texto enviado em cada etapa do pedido.</p>
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
              <strong>Carregando modelos...</strong>
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
                        <span>{draft.enabled ? "Ativo" : "Inativo"}</span>
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
                          Desativar
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
              <FileText size={28} />
              <strong>Crie uma sessao para personalizar modelos</strong>
            </div>
          )}
        </article>

        <form className="panel whatsapp-test" onSubmit={handleWhatsappTestSubmit}>
          <h2>Teste de Envio</h2>
          <label className="field">
            <span>Telefone Destino (com DDD)</span>
            <div>
              <input onChange={(event) => setWhatsappForm((current) => ({ ...current, phone: event.target.value }))} value={whatsappForm.phone} />
            </div>
          </label>
          <label className="field">
            <span>Mensagem de Teste</span>
            <textarea onChange={(event) => setWhatsappForm((current) => ({ ...current, message: event.target.value }))} value={whatsappForm.message} />
          </label>
          <button className="primary-button" disabled={!whatsappConnected || whatsappTestMutation.isPending} type="submit">
            {whatsappTestMutation.isPending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            Enviar Mensagem de Teste
          </button>
        </form>
      </div>
    </section>
  );
}
