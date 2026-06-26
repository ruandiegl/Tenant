import "./styles.css";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, QrCode, RefreshCw, Save, Send, Wifi, WifiOff } from "lucide-react";
import { toast } from "react-toastify";
import { useTenant } from "../../../app/providers/tenant-provider";
import { PageHeader } from "../../../components/ui/page-header";
import { whatsappService } from "../../../services/whatsapp";

export function AdminWhatsapp() {
  const { tenant, settings } = useTenant();
  const queryClient = useQueryClient();
  const whatsappQuery = useQuery({
    queryKey: ["tenant-whatsapp-session", tenant.id],
    queryFn: whatsappService.getSession,
    refetchInterval: (query) => (query.state.data?.status === "PENDING_QR" ? 10_000 : false)
  });
  const [whatsappForm, setWhatsappForm] = useState({
    phone: settings.whatsapp ?? "",
    message: "Mensagem de teste do podePedir."
  });

  const whatsappStartMutation = useMutation({
    mutationFn: whatsappService.createOrStartSession,
    onSuccess: (session) => {
      queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], session);
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
    onSuccess: (session) => {
      queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], session);
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

  useEffect(() => {
    setWhatsappForm((current) => ({
      ...current,
      phone: settings.whatsapp ?? current.phone
    }));
  }, [settings.whatsapp]);

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
      notifyOrderStatus: whatsappSession.notifyOrderStatus,
      welcomeMessage: whatsappSession.welcomeMessage ?? null
    });
  };

  const handleWhatsappTestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await whatsappTestMutation.mutateAsync(whatsappForm);
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
              <label className="field">
                <span>Mensagem automatica</span>
                <textarea
                  onChange={(event) =>
                    queryClient.setQueryData(["tenant-whatsapp-session", tenant.id], {
                      ...whatsappSession,
                      welcomeMessage: event.target.value
                    })
                  }
                  value={whatsappSession.welcomeMessage ?? ""}
                />
              </label>
              <button className="primary-button" disabled={whatsappSettingsMutation.isPending} type="submit">
                {whatsappSettingsMutation.isPending ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                Salvar bot
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
