(() => {
  const request = async (url, options = {}) => {
    const response = await window.apiFetch(url, options);
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
      body: JSON.stringify({
        ...student,
        actorName: JSON.parse(sessionStorage.getItem('activeUser') || '{}').name || '',
      }),
    },
  );

  const eliminar = (studentId) => {
    const actorName = JSON.parse(sessionStorage.getItem('activeUser') || '{}').name || '';
    return request(
      `${window.APP_CONFIG.api.students}?id=${encodeURIComponent(studentId)}&actorName=${encodeURIComponent(actorName)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, actorName }),
      },
    );
  };

  const registrarAsistencia = (payload) => request(
    window.APP_CONFIG.api.attendance,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        actorName: payload.teacherName || JSON.parse(sessionStorage.getItem('activeUser') || '{}').name || '',
      }),
    },
  );

  window.EstudiantesModelo = Object.freeze({
    listar,
    guardar,
    eliminar,
    registrarAsistencia,
  });
})();
