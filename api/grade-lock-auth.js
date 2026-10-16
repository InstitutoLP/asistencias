const { issueGradeLockToken } = require('../grade-lock-security');

const parseBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const { password } = await parseBody(req);
    const token = issueGradeLockToken(password);
    if (!token) return res.status(401).json({ error: 'Contraseña de Andy incorrecta.' });
    return res.status(200).json({ token });
  } catch (error) {
    console.error('No se pudo autorizar la gestión de bloqueos:', error.message);
    return res.status(503).json({ error: error.message });
  }
};
