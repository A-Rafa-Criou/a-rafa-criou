type CallbackDetailMessageMap = Record<string, string>;

const MERCADO_PAGO_DETAIL_MESSAGES: CallbackDetailMessageMap = {
  state_secret_not_configured:
    'A configuracao de seguranca esta incompleta. Tente novamente em alguns minutos.',
  invalid_format: 'Nao foi possivel validar a resposta de seguranca.',
  malformed: 'Resposta de autenticacao invalida.',
  invalid_signature: 'Assinatura de seguranca invalida no retorno do Mercado Pago.',
  expired: 'A tentativa de conexao expirou. Inicie novamente.',
  state_expired: 'A tentativa de conexao expirou. Inicie novamente.',
  invalid_payload: 'Payload de seguranca invalido.',
  state_user_mismatch: 'A conexao retornou para outra conta. Tente novamente na conta correta.',
  invalid_json_response: 'Resposta invalida do Mercado Pago ao trocar token.',
  no_access_token: 'Mercado Pago nao retornou token de acesso.',
  state_parse_error: 'Nao foi possivel validar o retorno de seguranca.',
  missing_state_fields: 'Nao foi possivel validar o retorno de seguranca.',
  invalid_signature_length: 'Nao foi possivel validar o retorno de seguranca.',
};

export function getMercadoPagoCallbackErrorMessage(
  errorCode: string,
  detail: string | null,
  context: 'dashboard' | 'onboarding' = 'onboarding'
): string {
  const detailMessage = detail
    ? MERCADO_PAGO_DETAIL_MESSAGES[detail] || `Parametros invalidos: ${detail}.`
    : null;

  const tokenExchangeLabel =
    context === 'dashboard'
      ? 'Falha ao conectar com Mercado Pago'
      : 'Falha ao trocar token de autorizacao';

  const messages: Record<string, string> = {
    denied: 'Voce negou a autorizacao. Tente novamente quando estiver pronto.',
    invalid_params: detailMessage || 'Parametros invalidos. Tente novamente.',
    affiliate_not_found: 'Afiliado nao encontrado.',
    token_exchange_failed: `${tokenExchangeLabel}${detail ? `: ${detail}` : ''}.`,
    user_fetch_failed: `Erro ao buscar dados do usuario${detail ? `: ${detail}` : ''}.`,
    internal_error: 'Erro interno. Tente novamente mais tarde.',
  };

  return messages[errorCode] || `Erro desconhecido: ${errorCode}`;
}
