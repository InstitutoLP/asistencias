const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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

const supabaseFetch = async (path, options = {}) => {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  return fetch(url, { ...options, headers });
};

const isValidDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);

const listAttendanceHistory = async (req, res) => {
  const { startDate, endDate } = req.query || {};
  if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
    return res.status(400).json({ error: 'El rango de fechas de asistencia no es válido.' });
  }
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ error: 'La fecha inicial no puede ser posterior a la fecha final.' });
  }

  const filters = [
    'select=student_id,date,subject,subject_label,status,marked_at,marked_by,created_at,email_sent_at,last_email_sent_at',
    'order=date.desc,marked_at.desc',
  ];
  if (startDate) filters.push(`date=gte.${encodeURIComponent(startDate)}`);
  if (endDate) filters.push(`date=lte.${encodeURIComponent(endDate)}`);

  const records = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await supabaseFetch(`/attendances?${filters.join('&')}`, {
      headers: { Range: `${offset}-${offset + pageSize - 1}` },
    });
    const rows = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(rows.message || rows.error || 'No se pudo consultar el historial de asistencia.');
    }
    if (!Array.isArray(rows)) throw new Error('Supabase devolvió un historial de asistencia inválido.');
    records.push(...rows);
    if (rows.length < pageSize) break;
  }

  if (!records.length) return res.status(200).json({ attendances: [] });

  const studentsResponse = await supabaseFetch('/students?select=id,name,year,cedula');
  const students = await studentsResponse.json().catch(() => []);
  if (!studentsResponse.ok) {
    throw new Error(students.message || students.error || 'No se pudieron consultar los estudiantes.');
  }
  if (!Array.isArray(students)) throw new Error('Supabase devolvió una lista de estudiantes inválida.');
  const studentsById = new Map(students.map((student) => [String(student.id), student]));

  return res.status(200).json({
    attendances: records.map((record) => {
      const student = studentsById.get(String(record.student_id));
      return {
        ...record,
        marked_at: record.marked_at || record.created_at || null,
        student_name: student?.name || 'Estudiante no encontrado',
        year: student?.year ?? null,
        cedula: student?.cedula || '',
      };
    }),
  });
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    try {
      return await listAttendanceHistory(req, res);
    } catch (error) {
      console.error('attendance history API error:', error);
      return res.status(500).json({ error: error.message || 'No se pudo consultar el historial de asistencia.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', allowed: ['GET', 'POST'] });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Falta SUPABASE_URL o SUPABASE_KEY en Vercel.' });
  }

  try {
    const body = await parseBody(req);
    const { id, name, cedula, email, phone, year, subject, subjectLabel, status, date, teacherName } = body || {};

    if (!id || !name || !email || !year || !subject || !status) {
      return res.status(400).json({ error: 'Falta id, nombre, correo, año, materia o estado.' });
    }

    const attendanceDate = date || new Date().toISOString().slice(0, 10);

    const studentPayload = {
      id: String(id),
      name,
      cedula: cedula || null,
      email,
      phone: phone || null,
      year: Number(year),
    };

    const studentUpsert = await supabaseFetch('/students?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify([studentPayload]),
    });
    const studentData = await studentUpsert.json().catch(() => []);

    if (!studentUpsert.ok) {
      return res.status(studentUpsert.status).json({
        error: studentData.message || studentData.error || 'No se pudo guardar el estudiante en Supabase.',
      });
    }

    const currentStudentResponse = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}&select=*`);
    const currentStudents = await currentStudentResponse.json().catch(() => []);
    const currentStudent = Array.isArray(currentStudents) && currentStudents.length ? currentStudents[0] : {};

    const attendanceMap = currentStudent.attendance || {};
    attendanceMap[subject] = { status, label: subjectLabel || subject };

    const attendanceByDateMap = currentStudent.attendance_by_date || {};
    attendanceByDateMap[attendanceDate] = attendanceByDateMap[attendanceDate] || {};
    const markedAt = new Date().toISOString();
    attendanceByDateMap[attendanceDate][subject] = {
      status,
      time: markedAt,
      teacher: teacherName || '',
    };

    const patchStudent = await supabaseFetch(`/students?id=eq.${encodeURIComponent(String(id))}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        attendance: attendanceMap,
        attendance_by_date: attendanceByDateMap,
        name,
        cedula: cedula || currentStudent.cedula || null,
        email,
        phone: phone || currentStudent.phone || null,
        year: Number(year),
      }),
    });
    const patchedStudent = await patchStudent.json().catch(() => []);
    if (!patchStudent.ok) {
      return res.status(patchStudent.status).json({
        error: patchedStudent.message || patchedStudent.error || 'No se pudo actualizar la asistencia del estudiante.',
      });
    }

    const attendanceRow = {
      student_id: String(id),
      date: attendanceDate,
      subject,
      subject_label: subjectLabel || subject,
      status,
      marked_at: markedAt,
      marked_by: teacherName || null,
      email_sent_at: null,
    };

    const attendanceInsert = await supabaseFetch(`/attendances?on_conflict=student_id,date,subject`, {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify([attendanceRow]),
    });
    const attendanceResult = await attendanceInsert.json().catch(() => []);

    if (!attendanceInsert.ok) {
      return res.status(attendanceInsert.status).json({
        error: attendanceResult.message || attendanceResult.error || 'No se pudo registrar la asistencia.',
      });
    }

    const attendanceRecord = Array.isArray(attendanceResult) ? attendanceResult[0] : attendanceResult;

    return res.status(200).json({
      success: true,
      student: Array.isArray(patchedStudent) ? patchedStudent[0] : patchedStudent,
      attendance: attendanceRecord,
      attendanceTime: attendanceRecord?.marked_at || markedAt,
      date: attendanceDate,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error guardando asistencia en Supabase.',
      details: error.message,
    });
  }
};
