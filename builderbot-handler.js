const BOT_ID = process.env.BUILDERBOT_BOT_ID;
const API_KEY = process.env.BUILDERBOT_API_KEY;

const parseRequestBody = (body) => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body || '{}');
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
};

module.exports = async function builderbotHandler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }
  if (!BOT_ID || !API_KEY) {
    return res.status(503).json({ error: 'El chat no está configurado todavía.' });
  }

  const body = parseRequestBody(req.body);
  const number = String(body?.number || '').replace(/\D/g, '');
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!/^\d{8,15}$/.test(number) || !content || content.length > 1000) {
    return res.status(400).json({ error: 'Escribe un teléfono válido con código de país y un mensaje de hasta 1000 caracteres.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://app.builderbot.cloud/api/v2/${encodeURIComponent(BOT_ID)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-builderbot': API_KEY,
      },
      body: JSON.stringify({
        number,
        checkIfExists: false,
        messages: { content },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`BuilderBot rechazó el mensaje (HTTP ${response.status}).`);
      return res.status(502).json({ error: 'No se pudo enviar el mensaje al asistente. Intenta nuevamente.' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'BuilderBot tardó demasiado en responder. Intenta nuevamente.'
      : 'No se pudo conectar con el asistente. Intenta nuevamente.';
    console.error('Error de conexión con BuilderBot:', error.message);
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
};
