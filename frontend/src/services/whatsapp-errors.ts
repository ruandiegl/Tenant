import { ApiError } from "./api";

const friendlyByCode: Record<string, string> = {
  WAHA_UNREACHABLE: "Nao conseguimos falar com o servico do WhatsApp agora. Tente novamente em instantes.",
  WAHA_UNAUTHORIZED: "A chave de acesso do WhatsApp esta incorreta. Chame o suporte para revisar a configuracao.",
  WAHA_API_NOT_FOUND: "A API do WhatsApp esta em uma porta ou URL incorreta. Chame o suporte para revisar a configuracao.",
  WAHA_SESSION_NOT_FOUND: "Nao encontramos essa sessao. Gere um novo QR Code para reconectar.",
  WAHA_SESSION_NOT_READY: "O WhatsApp ainda nao esta conectado. Escaneie o QR Code antes de enviar mensagens.",
  WAHA_QR_UNAVAILABLE: "O QR Code ainda nao ficou disponivel. Aguarde alguns segundos e tente atualizar.",
  WAHA_QR_EXPIRED: "Este QR Code expirou. Estamos gerando um novo para voce.",
  WAHA_INVALID_PHONE: "Esse numero nao parece valido ou nao esta disponivel no WhatsApp.",
  WAHA_SEND_REJECTED: "Nao foi possivel enviar a mensagem agora. Confira a conexao e tente novamente."
};

const technicalFragments: Array<[RegExp, string]> = [
  [/Cannot (GET|POST|PUT|DELETE) \/api\/sessions/i, friendlyByCode.WAHA_API_NOT_FOUND],
  [/session not found/i, friendlyByCode.WAHA_SESSION_NOT_FOUND],
  [/not ready|not as expected|SCAN_QR_CODE|STARTING/i, friendlyByCode.WAHA_SESSION_NOT_READY],
  [/timeout|tempo esgotado|fetch failed|ECONNREFUSED|ENOTFOUND/i, friendlyByCode.WAHA_UNREACHABLE],
  [/unauthorized|forbidden|401|403/i, friendlyByCode.WAHA_UNAUTHORIZED],
  [/invalid.*phone|phone.*invalid|number.*invalid/i, friendlyByCode.WAHA_INVALID_PHONE]
];

function getErrorCode(error: unknown) {
  const details = error instanceof ApiError && error.details && typeof error.details === "object" ? error.details as Record<string, unknown> : null;
  return typeof details?.code === "string" ? details.code : undefined;
}

export function getWhatsappFriendlyError(error: unknown, fallback = "Nao foi possivel concluir a acao no WhatsApp. Tente novamente.") {
  const code = getErrorCode(error);

  if (code && friendlyByCode[code]) {
    return friendlyByCode[code];
  }

  const message = error instanceof Error ? error.message : String(error);

  for (const [pattern, friendly] of technicalFragments) {
    if (pattern.test(message)) {
      return friendly;
    }
  }

  if (error instanceof ApiError && error.status >= 500) {
    return "Estamos com instabilidade na conexao com o WhatsApp. Tente novamente em alguns minutos.";
  }

  return message && !message.includes("<!DOCTYPE html>") && !message.includes(" at ") ? message : fallback;
}

export function getWhatsappSessionIssue(lastError?: string | null) {
  if (!lastError) return null;
  return getWhatsappFriendlyError(new Error(lastError), "A conexao com o WhatsApp precisa de atencao. Gere um novo QR Code para reconectar.");
}
