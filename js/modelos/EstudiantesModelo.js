(() => {
  const request = async (url, options = {}) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Error ${response.status} en la solicitud de estudiantes.`);
    }

    return data;
  };

  const listar = ({ year, date } = {}) => {
    const url = new URL(window.APP_CONFIG.api.students);
    if (year) url.searchParams.set('year', year);
    if (date) url.searchParams.set('date', date);

    return request(url, { headers: { 'Cache-Control': 'no-cache' } });
  };

  const guardar = (student, method = 'POST') => request(
    window.APP_CONFIG.api.students,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    },
  );

  const eliminar = (studentId) => request(
    `${window.APP_CONFIG.api.students}?id=${encodeURIComponent(studentId)}`,
    { method: 'DELETE' },
  );

  const registrarAsistencia = (payload) => request(
    window.APP_CONFIG.api.attendance,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  window.EstudiantesModelo = Object.freeze({
    listar,
    guardar,
    eliminar,
    registrarAsistencia,
  });
})();
