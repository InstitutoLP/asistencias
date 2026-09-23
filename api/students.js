module.exports = async function handler(req, res) {
  const allowOrigin = '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json([]);
    }

    if (req.method === 'POST' || req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      return res.status(200).json({
        success: true,
        message: 'Estudiante sincronizado correctamente.',
        ...body,
      });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id || (typeof req.body === 'string' ? JSON.parse(req.body || '{}').id : req.body?.id);
      return res.status(200).json({ success: true, message: 'Estudiante eliminado.', id });
    }

    return res.status(405).json({ error: 'Method Not Allowed', allowed: ['GET', 'POST', 'PATCH', 'DELETE'] });
  } catch (error) {
    return res.status(500).json({ error: 'Error en la API de estudiantes.', details: error.message });
  }
};
