module.exports = async function handler(req, res) {
  const allowOrigin = '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', allowed: ['POST'] });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { id, name, email, year, subject, status, date, cedula, phone, subjectLabel } = body;

    if (!id || !name || !email || !year || !subject || !status) {
      return res.status(400).json({
        error: 'Falta id, nombre, correo, año, materia o estado.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Asistencia registrada correctamente.',
      id,
      name,
      email,
      year,
      subject,
      subjectLabel: subjectLabel || subject,
      status,
      date: date || new Date().toISOString().slice(0, 10),
      cedula: cedula || '',
      phone: phone || '',
      emailSent: false,
      emailError: 'Email no configurado en Vercel',
    });
  } catch (error) {
    return res.status(500).json({
      error: 'No se pudo guardar la asistencia.',
      details: error.message,
    });
  }
};
