export type TelegramSendResult =
  | { ok: true }
  | { ok: false; error: string; status?: number }

/** Envia alerta pessoal no Telegram (Bot API). */
export async function sendTelegramAlert(text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()

  if (!token || !chatId) {
    return {
      ok: false,
      error: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados.',
      status: 503,
    }
  }

  const message = text.trim()
  if (!message) {
    return { ok: false, error: 'Mensagem vazia.', status: 400 }
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return {
      ok: false,
      error: body || `Telegram respondeu ${res.status}`,
      status: 502,
    }
  }

  return { ok: true }
}
