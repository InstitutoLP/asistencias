const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const { authenticateRequest } = require('../auth-service');

const supabaseFetch = async (path, options = {}) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return response;
};

const parseBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (error) { reject(error); }
    });
  });
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Falta la configuración de Supabase.' });
  }

  try {
    const auth = await authenticateRequest(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo validar la sesión.' });
  }

  if (req.method === 'GET') {
    try {
      const response = await supabaseFetch('/audit_logs?select=id,created_at,actor_name,action,entity_type,entity_id,student_name,details&order=created_at.desc&limit=500');
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || data.error || 'No se pudo consultar la bitácora.');
      return res.status(200).json({ logs: Array.isArray(data) ? data : [] });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'No se pudo consultar la bitácora.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const actorName = String(body.actorName || body.actor_name || '').trim();
      const action = String(body.action || '').trim();
      const entityType = String(body.entityType || body.entity_type || '').trim();
      if (!actorName || !action || !entityType) {
        return res.status(400).json({ error: 'Falta actor, acción o tipo de entidad.' });
      }
      const payload = [{
        actor_name: actorName,
        action,
        entity_type: entityType,
        entity_id: body.entityId || body.entity_id || null,
        student_name: body.studentName || body.student_name || null,
        details: body.details && typeof body.details === 'object' ? body.details : {},
      }];
      const response = await supabaseFetch('/audit_logs', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || data.error || 'No se pudo guardar el registro de cambios.');
      return res.status(201).json({ log: Array.isArray(data) ? data[0] : data });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'No se pudo guardar el registro de cambios.' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed', allowed: ['GET', 'POST'] });
};
