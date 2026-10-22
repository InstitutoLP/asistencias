// CONFIGURACIÓN DE ENLACES
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vR2dzgdf5bWl2KBYcGTWxjjiIk6qKQ5NWjde1eyiv0Gy0velu_8JTPdu8O8WicEJQ/pub?output=csv`;
const API_SYNC_STATE = window.APP_CONFIG.api.syncState;
const API_STUDENTS = window.APP_CONFIG.api.students;
const PORTAL_BASE_PATH = window.location.pathname.match(/^(.*\/portal-estudiantes\.html)(?:\/.*)?$/)?.[1] || window.location.pathname;
const ATTENDANCE_CALCULATIONS = window.ATTENDANCE_CALCULATIONS;
const SCHOOL_YEAR = {
  start: Number(ATTENDANCE_CALCULATIONS.lapses[0].start.slice(0, 4)),
  end: Number(ATTENDANCE_CALCULATIONS.lapses[ATTENDANCE_CALCULATIONS.lapses.length - 1].end.slice(0, 4)),
};
const PERIODOS_PAGO = [
  { id: 'inscripcion', label: 'Inscripción' },
  { id: 'enero', label: 'Enero' },
  { id: 'febrero', label: 'Febrero' },
  { id: 'marzo', label: 'Marzo' },
  { id: 'abril', label: 'Abril' },
  { id: 'mayo', label: 'Mayo' },
  { id: 'junio', label: 'Junio' },
  { id: 'julio', label: 'Julio' },
  { id: 'agosto', label: 'Agosto' },
  { id: 'septiembre', label: 'Septiembre' },
  { id: 'octubre', label: 'Octubre' },
  { id: 'noviembre', label: 'Noviembre' },
  { id: 'diciembre', label: 'Diciembre' },
];

let datosEstudianteActual = null;
let chartsInstancias = {};
let boletaAutorizadaActual = false;

const SHEET_SUBJECT_NAMES = {
  castellano: ['Castellano'],
  ingles: ['Ingles', 'Inglés'],
  matematica: ['Matematica', 'Matemática', 'Matemáticas'],
  matematicas: ['Matematica', 'Matemática', 'Matemáticas'],
  'educacion-fisica': ['Educacion Fisica', 'Educación Física'],
  'arte-patrimonio': ['Arte y Patrimonio'],
  'ciencias-naturales': ['Ciencias Naturales'],
  fisica: ['Fisica', 'Física'],
  quimica: ['Quimica', 'Química'],
  biologia: ['Biologia', 'Biología'],
  'ciencias-tierra': ['Ciencias de la Tierra'],
  ghc: ['Geografia, historia y ciudadania', 'GHC'],
  'formacion-soberania': ['Formacion para la Soberania', 'Formación para la Soberanía'],
  'orientacion-convivencia': ['Orientacion y Convivencia', 'Orientación y Convivencia'],
  frances: ['Frances', 'Francés'],
  crp: ['CRP'],
};

const normalizarTexto = (texto) => texto ? String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
const normalizarCedula = (cedula) => String(cedula || '').trim().toUpperCase().replace(/\D/g, '') || String(cedula || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const normalizarMontoPago = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const parametrosAsistenciaEscolar = () => {
  const { lapses } = ATTENDANCE_CALCULATIONS;
  return `&attendanceStartDate=${lapses[0].start}&attendanceEndDate=${lapses[lapses.length - 1].end}`;
};

const coincideConEstudiante = (registro, estudiante) => {
  const cedulaKey = obtenerClaveEstudiante(estudiante, 'cedula');
  const nombreKey = obtenerClaveEstudiante(estudiante, 'nombre');
  const cedulaRegistroKey = obtenerClaveEstudiante(registro, 'cedula');
  const nombreRegistroKey = obtenerClaveEstudiante(registro, 'nombre');
  const cedulaEstudiante = normalizarCedula(estudiante[cedulaKey]);
  const nombreEstudiante = normalizarTexto(estudiante[nombreKey] || estudiante.Nombre || estudiante.name);
  const cedulaRegistro = normalizarCedula(registro[cedulaRegistroKey] || registro.identificacion);
  const nombreRegistro = normalizarTexto(registro[nombreRegistroKey] || registro.name || registro.Nombre);

  if (cedulaEstudiante && cedulaRegistro) {
    return cedulaEstudiante === cedulaRegistro;
  }
  return Boolean(nombreEstudiante && nombreRegistro && nombreEstudiante === nombreRegistro);
};

const obtenerClaveEstudiante = (estudiante, tipo) => Object.keys(estudiante || {}).find(key => {
  const clave = normalizarTexto(key);
  if (tipo === 'cedula') return clave.includes('cedula');
  if (tipo === 'ano') return clave.includes('ano') || clave.includes('grado');
  return clave.includes('nombre') || clave.includes('estudiante') || clave === 'name';
});

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];
    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
};

const obtenerNotasDeSheets = async () => {
  try {
    const response = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Google Sheets respondió con ${response.status}`);

    const text = await response.text();
    const rows = text.split(/\r?\n/).filter(row => row.trim() !== '').map(parseCsvLine);
    if (!rows.length) return [];

    const headers = rows[0].map(header => header.replace(/^\uFEFF/, '').trim());
    return rows.slice(1).map(row => headers.reduce((student, header, index) => {
      student[header] = row[index] || '';
      return student;
    }, {}));
  } catch (error) {
    console.error('Error al leer Google Sheets:', error);
    return null;
  }
};
const tieneNotasDelModulo = (estudiante) => (
  estudiante?.grades && Object.keys(estudiante.grades).length > 0
);

const normalizarNota = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const nota = Number(String(valor).replace(',', '.'));
  return Number.isFinite(nota) ? nota : null;
};

const obtenerNotaLegada = (estudiante, subjectId, lapso) => {
  const nombres = SHEET_SUBJECT_NAMES[subjectId] || [];
  const columnas = nombres.map((materia) => normalizarTexto(`${materia}_${lapso}`).replace(/\s+/g, ''));
  const columna = Object.keys(estudiante || {}).find((nombre) => (
    columnas.includes(normalizarTexto(nombre).replace(/\s+/g, ''))
  ));
  return columna ? estudiante[columna] || '-' : '-';
};

const extraerValorColumna = (estudiante, subjectId, lapso) => {
  const grades = estudiante?.grades?.[subjectId];
  if (lapso === 'Final') {
    const definitiva = window.calculateDefinitiveGrade(grades);
    if (definitiva) return definitiva.roundedGrade;
    const savedFinal = normalizarNota(grades?.Final);
    if (savedFinal !== null) return savedFinal;
    if (!tieneNotasDelModulo(estudiante)) {
      const legacyFinal = normalizarNota(obtenerNotaLegada(estudiante, subjectId, 'Final'));
      if (legacyFinal !== null) return legacyFinal;
      const legacyGrades = Object.fromEntries(['1er', '2do', '3er'].map((period) => (
        [period, normalizarNota(obtenerNotaLegada(estudiante, subjectId, period))]
      )));
      return window.calculateDefinitiveGrade(legacyGrades)?.roundedGrade ?? '-';
    }
    return '-';
  } else if (grades && Object.prototype.hasOwnProperty.call(grades, lapso)) {
    return normalizarNota(grades[lapso]);
  }

  return tieneNotasDelModulo(estudiante) ? '-' : obtenerNotaLegada(estudiante, subjectId, lapso);
};

const formatearNota = (valor) => {
  const nota = normalizarNota(valor);
  if (nota === null) return '-';
  const texto = Number.isInteger(nota) ? String(nota) : String(Number(nota.toFixed(2)));
  return nota < 10 ? texto.padStart(2, '0') : texto;
};

const actualizarTexto = (id, valor) => {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor || '-';
};

const obtenerPromedio = (estudiante, materias, periodo) => {
  const notas = materias
    .map(({ id }) => normalizarNota(extraerValorColumna(estudiante, id, periodo)))
    .filter((nota) => nota !== null);
  if (!notas.length) return '-';
  const promedio = notas.reduce((total, nota) => total + nota, 0) / notas.length;
  return String(Number(promedio.toFixed(2)));
};

const calcularInasistencias = (estudiante) => {
  const totals = {};
  const bySubject = {};
  ATTENDANCE_CALCULATIONS.lapses.forEach(({ id, start, end }) => {
    const lapso = ATTENDANCE_CALCULATIONS.calculate(estudiante, { startDate: start, endDate: end });
    totals[id] = { absences: lapso.absences, classes: lapso.total };
    Object.entries(lapso.bySubject).forEach(([subjectId, counts]) => {
      bySubject[subjectId] = bySubject[subjectId] || {};
      bySubject[subjectId][id] = { absences: counts.absences, classes: counts.total };
    });
  });
  return { totals, bySubject };
};

const formatearPorcentajeInasistencia = ({ absences, classes }) => (
  classes ? `${Number(((absences / classes) * 100).toFixed(1))}%` : '-'
);

const SUBJECTS_WITHOUT_EMPTY_REVIEW_CELLS = new Set(['orientacion-convivencia', 'crp', 'frances']);

const crearFilaMateria = (estudiante, subjectId, inasistenciasPorMateria, pendingSubjectsById) => {
  const display = window.REPORT_SUBJECT_DISPLAY[subjectId] || { label: subjectId.toUpperCase() };
  const row = document.createElement('tr');
  const subjectCell = row.insertCell();
  subjectCell.className = 'col-area';
  subjectCell.textContent = display.label;

  ['1er', '2do', '3er', 'Final'].forEach((period) => {
    const value = extraerValorColumna(estudiante, subjectId, period);
    row.insertCell().textContent = subjectId === 'crp' && period === 'Final'
      ? window.convertCRPGrade(value)
      : formatearNota(value);
  });
  const inasistencias = inasistenciasPorMateria[subjectId];
  ['1er', '2do', '3er'].forEach((period) => {
    row.insertCell().textContent = formatearPorcentajeInasistencia(
      inasistencias?.[period] || { absences: 0, classes: 0 },
    );
  });
  const totalInasistencias = ['1er', '2do', '3er'].reduce((total, period) => ({
    absences: total.absences + (inasistencias?.[period]?.absences || 0),
    classes: total.classes + (inasistencias?.[period]?.classes || 0),
  }), { absences: 0, classes: 0 });
  row.insertCell().textContent = formatearPorcentajeInasistencia(totalInasistencias);
  const pendingSubject = pendingSubjectsById.get(subjectId);
  if (pendingSubject || !SUBJECTS_WITHOUT_EMPTY_REVIEW_CELLS.has(subjectId)) {
    for (let index = 0; index < 3; index += 1) {
      const grade = normalizarNota(pendingSubject?.revisions?.[index]);
      row.insertCell().textContent = grade === null ? '-' : formatearNota(grade);
    }
  }
  return row;
};

const renderizarBoletaEstudiante = (estudiante) => {
  const year = Number(estudiante?.year);
  const materias = window.REPORT_SUBJECT_IDS_BY_YEAR[year] || [];
  const participacion = window.REPORT_PARTICIPATION_IDS_BY_YEAR[year] || [];
  const cuerpo = document.getElementById('tablaNotasBody');
  const pieTabla = document.getElementById('tablaNotasFooter');
  const filaPromedio = pieTabla?.querySelector('.row-promedio');
  const materiasPlan = materias.map((id) => ({ id }));
  const inasistencias = calcularInasistencias(estudiante);
  const pendingSubjects = Array.isArray(estudiante?.pendingSubjects) ? estudiante.pendingSubjects : [];
  const pendingSubjectsById = new Map(pendingSubjects.map((pendingSubject) => [pendingSubject.subjectId, pendingSubject]));

  if (cuerpo) {
    cuerpo.replaceChildren(...materias.map((subjectId) => (
      crearFilaMateria(estudiante, subjectId, inasistencias.bySubject, pendingSubjectsById)
    )));
  }
  if (pieTabla && filaPromedio) {
    const averageReviewCell = filaPromedio.querySelector('td[colspan="3"]');
    if (averageReviewCell) averageReviewCell.remove();
    const filasParticipacion = [];
    if (participacion.length) {
      const headerRow = document.createElement('tr');
      headerRow.className = 'row-seccion-header';
      const headerCell = headerRow.insertCell();
      headerCell.colSpan = 9;
      headerCell.textContent = 'PARTICIPACIÓN EN GRUPO DE CREACIÓN, RECREACIÓN Y PRODUCCIÓN';
      filasParticipacion.push(
        headerRow,
        ...participacion.map((subjectId) => (
          crearFilaMateria(estudiante, subjectId, inasistencias.bySubject, pendingSubjectsById)
        )),
      );
    }
    pieTabla.replaceChildren(filaPromedio, ...filasParticipacion);
  }

  actualizarTexto('prom1er', obtenerPromedio(estudiante, materiasPlan, '1er'));
  actualizarTexto('prom2do', obtenerPromedio(estudiante, materiasPlan, '2do'));
  actualizarTexto('prom3er', obtenerPromedio(estudiante, materiasPlan, '3er'));
  actualizarTexto('promFinal', obtenerPromedio(estudiante, materiasPlan, 'Final'));

  ['1er', '2do', '3er'].forEach((period) => {
    actualizarTexto(`inas${period}`, formatearPorcentajeInasistencia(inasistencias.totals[period]));
  });
  const totalInasistencias = Object.values(inasistencias.totals).reduce((total, period) => ({
    absences: total.absences + period.absences,
    classes: total.classes + period.classes,
  }), { absences: 0, classes: 0 });
  actualizarTexto('inasTotal', formatearPorcentajeInasistencia(totalInasistencias));

  const pendientesBody = document.getElementById('tablaPendientesBody');
  if (pendientesBody) {
    pendientesBody.replaceChildren();
    if (!pendingSubjects.length) {
      const row = pendientesBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.textContent = 'Sin materias pendientes registradas.';
    } else {
      pendingSubjects.forEach((pendingSubject) => {
        const row = pendientesBody.insertRow();
        row.insertCell().textContent = pendingSubject.subjectLabel || pendingSubject.subjectId || '-';
        for (let index = 0; index < 3; index += 1) {
          const grade = normalizarNota(pendingSubject.revisions?.[index]);
          row.insertCell().textContent = grade === null ? '-' : formatearNota(grade);
        }
      });
    }
  }

  const seccionKey = Object.keys(estudiante || {}).find((key) => normalizarTexto(key).includes('seccion'));
  actualizarTexto('anoEscolarDisplay', `AÑO ESCOLAR ${SCHOOL_YEAR.start}-${SCHOOL_YEAR.end}`);
  actualizarTexto('anoDisplay', Number.isFinite(year) ? `${year}º` : '-');
  actualizarTexto('seccionDisplay', estudiante?.[seccionKey] || 'U');

  const materiasGrafico = materias.map((id) => [id, window.REPORT_SUBJECT_DISPLAY[id]?.code || id]);
  renderizarGraficos(materiasGrafico, estudiante, estudiante, estudiante);
};

const renderizarGraficos = (materias, datosPrimerLapso, datosSegundoLapso, datosTercerLapso) => {
  if (typeof Chart === 'undefined') return;

  const colores = ['#4472c4', '#ed7d31', '#7f7f7f'];
  const lapsos = [
    ['chart1erLapso', '1er', datosPrimerLapso, colores[0]],
    ['chart2doLapso', '2do', datosSegundoLapso, colores[1]],
    ['chart3erLapso', '3er', datosTercerLapso, colores[2]],
  ];
  const etiquetas = materias.map(([, codigo]) => codigo);

  lapsos.forEach(([id, lapso, datos, color]) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    chartsInstancias[id]?.destroy();

    chartsInstancias[id] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          data: materias.map(([materia]) => {
            const valor = Number.parseFloat(String(extraerValorColumna(datos, materia, lapso)).replace(',', '.'));
            return Number.isFinite(valor) ? valor : null;
          }),
          backgroundColor: color,
          borderColor: color,
          borderWidth: 0,
          barPercentage: 0.42,
          categoryPercentage: 0.8,
        }],
      },
      options: {
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#333333', font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            max: 20,
            ticks: { stepSize: 2, color: '#333333', font: { size: 10 } },
            grid: { color: '#b7b7b7', lineWidth: 1 },
          },
        },
      },
    });
  });
};

window.descargarBoletaPDF = async () => {
  if (!datosEstudianteActual) return;

  const boton = document.getElementById('btnDescargarBoleta');
  const textoOriginal = boton?.textContent;
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Generando PDF...';
  }

  try {
    await window.loadPdfLibraries();
    const { jsPDF } = window.jspdf;
    const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const boleta = document.querySelector('.boletin-paper');
    const imagenBoleta = await window.html2canvas(boleta, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
    });
    const margen = 8;
    const anchoPagina = documento.internal.pageSize.getWidth();
    const altoPagina = documento.internal.pageSize.getHeight();
    const anchoDisponible = anchoPagina - (margen * 2);
    const altoDisponible = altoPagina - (margen * 2);
    const altoProporcional = (imagenBoleta.height * anchoDisponible) / imagenBoleta.width;
    const escala = Math.min(1, altoDisponible / altoProporcional);
    const anchoFinal = anchoDisponible * escala;
    const altoFinal = altoProporcional * escala;
    const posicionX = (anchoPagina - anchoFinal) / 2;
    const posicionY = (altoPagina - altoFinal) / 2;

    documento.addImage(imagenBoleta.toDataURL('image/png'), 'PNG', posicionX, posicionY, anchoFinal, altoFinal);
    const nombre = String(datosEstudianteActual.Nombre || 'estudiante').trim().replace(/\s+/g, '_');
    documento.save(`Boleta_${nombre}.pdf`);
  } catch (error) {
    console.error('Error generando boleta PDF:', error);
    window.alert('No se pudo generar la boleta PDF. Verifica tu conexión e inténtalo de nuevo.');
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  }
};

window.descargarReciboPDF = async () => {
  const receipt = document.querySelector('.recibo-paper');
  const button = document.getElementById('btnDescargarReciboPDF');
  if (!receipt || !datosEstudianteActual) {
    window.alert('No se pudo preparar el recibo. Vuelve a cargar los datos del estudiante.');
    return;
  }

  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Generando PDF...';
  }

  try {
    await window.loadPdfLibraries();
    const { jsPDF } = window.jspdf;
    const documento = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const imagenRecibo = await window.html2canvas(receipt, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
    });
    const margen = 12;
    const anchoPagina = documento.internal.pageSize.getWidth();
    const altoPagina = documento.internal.pageSize.getHeight();
    const anchoDisponible = anchoPagina - (margen * 2);
    const altoDisponible = altoPagina - (margen * 2);
    const escala = anchoDisponible / imagenRecibo.width;
    const altoSegmento = Math.floor(altoDisponible / escala);
    for (let offsetY = 0; offsetY < imagenRecibo.height; offsetY += altoSegmento) {
      if (offsetY > 0) documento.addPage();
      const altoActual = Math.min(altoSegmento, imagenRecibo.height - offsetY);
      const segmento = document.createElement('canvas');
      segmento.width = imagenRecibo.width;
      segmento.height = altoActual;
      const contexto = segmento.getContext('2d');
      if (!contexto) throw new Error('No se pudo preparar una página del recibo PDF.');
      contexto.drawImage(
        imagenRecibo,
        0,
        offsetY,
        imagenRecibo.width,
        altoActual,
        0,
        0,
        imagenRecibo.width,
        altoActual,
      );
      documento.addImage(
        segmento.toDataURL('image/png'),
        'PNG',
        margen,
        margen,
        anchoDisponible,
        altoActual * escala,
      );
    }
    const nombre = String(datosEstudianteActual.Nombre || 'estudiante')
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
      .replace(/\s+/g, '_') || 'Estudiante';
    documento.save(`Recibo_${nombre}.pdf`);
  } catch (error) {
    console.error('Error generando el recibo PDF:', error);
    window.alert('No se pudo generar el recibo PDF. Verifica tu conexión e inténtalo de nuevo.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
};

// Modificación importante: Fetch a la API en lugar de LocalStorage
const obtenerEstadoGlobalBackend = async () => {
  try {
    const response = await fetch(`${API_SYNC_STATE}?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) return await response.json();
  } catch (error) {
    console.error("Error al consultar la autorización desde el backend:", error);
  }
  return null;
};

const valorBoletaAutorizada = (estudiante) => {
  if (!estudiante) return null;
  const estado = estudiante.BoletaVisible
    ?? estudiante.boleta_visible
    ?? estudiante.boletaVisible
    ?? estudiante.boletaAutorizada;
  if (estado === undefined || estado === null || estado === '') return null;
  if (typeof estado === 'boolean') return estado;
  const valorNormalizado = String(estado).toUpperCase().trim();
  if (['SI', 'SÍ', 'TRUE', '1', 'AUTORIZADO', 'AUTORIZADA'].includes(valorNormalizado)) return true;
  if (['NO', 'FALSE', '0', 'DESAUTORIZADO', 'DESAUTORIZADA'].includes(valorNormalizado)) return false;
  return null;
};

const verificarAutorizacionBoleta = async (estudiante) => {
  const estudianteRegistrado = await obtenerEstudiantePagosBackend(estudiante);
  const autorizacionDirecta = valorBoletaAutorizada(estudianteRegistrado);
  if (autorizacionDirecta !== null) return autorizacionDirecta;

  const backendData = await obtenerEstadoGlobalBackend();
  
  if (backendData && backendData.years) {
    let estadoEstudianteBackend = null;
    for (let year in backendData.years) {
      const estudiantesAno = backendData.years[year].students || [];
      const estudianteEncontrado = estudiantesAno.find(st => coincideConEstudiante(st, estudiante));
      
      if (estudianteEncontrado) {
        estadoEstudianteBackend = valorBoletaAutorizada(estudianteEncontrado);
        break;
      }
    }

    if (estadoEstudianteBackend !== null) return estadoEstudianteBackend;
  }

  return false;
};

const obtenerEstudiantePagosBackend = async (estudiante) => {
  const cedulaKey = obtenerClaveEstudiante(estudiante, 'cedula');
  const cedula = estudiante?.[cedulaKey];
  if (!cedula) return null;

  try {
    const response = await fetch(`${API_STUDENTS}?cedula=${encodeURIComponent(cedula)}&t=${Date.now()}${parametrosAsistenciaEscolar()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    const estudiantes = await response.json().catch(() => []);
    return Array.isArray(estudiantes)
      ? estudiantes.find((registro) => coincideConEstudiante(registro, estudiante)) || null
      : null;
  } catch (error) {
    console.warn('No se pudieron consultar los pagos del estudiante:', error);
    return null;
  }
};

const obtenerEstudianteSupabasePorId = async (id) => {
  try {
    const response = await fetch(`${API_STUDENTS}?id=${encodeURIComponent(id)}&t=${Date.now()}${parametrosAsistenciaEscolar()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    const estudiantes = await response.json().catch(() => []);
    return Array.isArray(estudiantes)
      ? estudiantes.find((estudiante) => String(estudiante.id) === String(id)) || null
      : null;
  } catch (error) {
    console.warn('No se pudo consultar el estudiante por ID:', error);
    return null;
  }
};

const actualizarUrlEstudiante = (id) => {
  const url = new URL(window.location.href);
  url.pathname = `${PORTAL_BASE_PATH}/${encodeURIComponent(id)}`;
  window.history.replaceState({}, '', url);
};

const obtenerIdEstudianteDeUrl = () => {
  const segmento = window.location.pathname.slice(PORTAL_BASE_PATH.length).replace(/^\/+/, '').split('/')[0];
  return segmento ? decodeURIComponent(segmento) : '';
};

document.getElementById('loginEstudianteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cedulaIngresada = document.getElementById('estudianteCedula').value;
  const botonSubmit = e.target.querySelector('button');
  const msjError = document.getElementById('errorMensaje');
  
  botonSubmit.textContent = "Buscando datos...";
  msjError.style.display = 'none';

  try {
    const estudianteSupabase = await obtenerEstudiantePagosBackend({ cedula: cedulaIngresada });
    if (!estudianteSupabase?.id) {
      msjError.textContent = '❌ Cédula no encontrada. Verifica los datos ingresados.';
      msjError.style.display = 'block';
      return;
    }

    let registroLegado = {};
    if (!tieneNotasDelModulo(estudianteSupabase)) {
      const notasLegadas = await obtenerNotasDeSheets();
      registroLegado = notasLegadas?.find((registro) => coincideConEstudiante(registro, estudianteSupabase)) || {};
    }
    const nombreKey = obtenerClaveEstudiante(registroLegado, 'nombre');
    const alumnoEncontrado = {
      ...registroLegado,
      ...estudianteSupabase,
      Nombre: estudianteSupabase.name || registroLegado[nombreKey] || '',
    };
    datosEstudianteActual = alumnoEncontrado;
    actualizarUrlEstudiante(estudianteSupabase.id);
    boletaAutorizadaActual = await verificarAutorizacionBoleta(datosEstudianteActual);
    mostrarDashboard();
    await renderizarReciboEstudiante();
    mostrarDocumento(boletaAutorizadaActual ? 'boleta' : 'recibo');
  } catch (error) {
    console.error('No se pudo cargar el portal del estudiante:', error);
    msjError.textContent = '❌ No se pudieron cargar los datos del estudiante.';
    msjError.style.display = 'block';
  } finally {
    botonSubmit.textContent = 'Entrar';
  }
});

const cargarEstudianteDesdeUrl = async () => {
  const id = obtenerIdEstudianteDeUrl();
  if (!id) return;

  const landingView = document.getElementById('landingView');
  const loadingView = document.getElementById('portalLoading');
  const msjError = document.getElementById('errorMensaje');
  landingView.classList.add('hidden');
  loadingView.classList.remove('hidden');

  const mostrarError = (mensaje) => {
    loadingView.classList.add('hidden');
    landingView.classList.remove('hidden');
    landingView.style.display = '';
    msjError.textContent = mensaje;
    msjError.style.display = 'block';
  };

  try {
    const estudianteSupabase = await obtenerEstudianteSupabasePorId(id);
    if (!estudianteSupabase) {
      mostrarError('❌ No se encontró un estudiante con ese enlace.');
      return;
    }

    let registroLegado = {};
    if (!tieneNotasDelModulo(estudianteSupabase)) {
      const notasLegadas = await obtenerNotasDeSheets();
      registroLegado = notasLegadas?.find((registro) => coincideConEstudiante(registro, estudianteSupabase)) || {};
    }
    const nombreKey = obtenerClaveEstudiante(registroLegado, 'nombre');
    const alumnoEncontrado = {
      ...registroLegado,
      ...estudianteSupabase,
      Nombre: estudianteSupabase.name || registroLegado[nombreKey] || '',
    };
    datosEstudianteActual = alumnoEncontrado;
    boletaAutorizadaActual = await verificarAutorizacionBoleta(datosEstudianteActual);
    mostrarDashboard();
    await renderizarReciboEstudiante();
    mostrarDocumento(boletaAutorizadaActual ? 'boleta' : 'recibo');
  } catch (error) {
    console.error('No se pudo cargar el estudiante desde el enlace:', error);
    mostrarError('❌ No se pudieron cargar los datos del estudiante.');
  }
};

cargarEstudianteDesdeUrl();

const mostrarDashboard = () => {
  const nombre = datosEstudianteActual?.Nombre || '';
  const cedulaKey = obtenerClaveEstudiante(datosEstudianteActual, 'cedula');
  const cedula = datosEstudianteActual?.[cedulaKey] || '';
  const nombreBoleta = document.getElementById('nombreCompletoDisplay');
  const cedulaBoleta = document.getElementById('cedulaDisplay');
  if (nombreBoleta) nombreBoleta.textContent = nombre;
  if (cedulaBoleta) cedulaBoleta.textContent = cedula;
  renderizarBoletaEstudiante(datosEstudianteActual);
  document.getElementById('nombreAlumnoDisplay').textContent = nombre;
  document.getElementById('portalLoading').classList.add('hidden');
  document.getElementById('landingView').classList.add('hidden');
  document.getElementById('mainView').classList.remove('hidden');
  document.getElementById('mainView').style.display = '';
};

const mostrarDocumento = (documento) => {
  if (documento === 'recibo' && datosEstudianteActual) {
    renderizarReciboEstudiante();
  }
  const mostrarBoleta = documento === 'boleta' && boletaAutorizadaActual;
  const boletaPanel = document.getElementById('boletaPanel');
  const reciboPanel = document.getElementById('reciboPanel');
  const tabBoleta = document.getElementById('tabBoleta');
  const tabRecibo = document.getElementById('tabRecibo');
  const boletaBloqueada = document.getElementById('boletaBloqueada');

  if (boletaPanel) boletaPanel.classList.toggle('hidden', !mostrarBoleta);
  if (reciboPanel) reciboPanel.classList.toggle('hidden', mostrarBoleta);
  if (tabBoleta) {
    tabBoleta.classList.toggle('active', mostrarBoleta);
    tabBoleta.style.display = boletaAutorizadaActual ? '' : 'none';
    tabBoleta.setAttribute('aria-selected', String(mostrarBoleta));
  }
  if (tabRecibo) {
    tabRecibo.classList.toggle('active', !mostrarBoleta);
    tabRecibo.setAttribute('aria-selected', String(!mostrarBoleta));
  }
  if (boletaBloqueada) boletaBloqueada.style.display = boletaAutorizadaActual ? 'none' : 'block';
};

// Reemplazar consulta de recibo de pagos
const renderizarReciboEstudiante = async () => {
  let estudianteBackend = null;
  let anoEstudiante = '';

  estudianteBackend = await obtenerEstudiantePagosBackend(datosEstudianteActual);
  if (estudianteBackend) anoEstudiante = estudianteBackend.year || '';

  const backendData = await obtenerEstadoGlobalBackend();

  if (!estudianteBackend && backendData && backendData.years) {
    Object.entries(backendData.years).some(([year, yearData]) => {
      const encontrado = (yearData.students || []).find(student => {
        return coincideConEstudiante(student, datosEstudianteActual);
      });
      if (encontrado) {
        estudianteBackend = encontrado;
        anoEstudiante = year;
        return true;
      }
      return false;
    });
  }

  const parsePayments = (val) => {
    if (!val) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return { ...val };
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  };

  const pagosRegistrados = parsePayments(estudianteBackend?.payments);

  const estadoPago = String(estudianteBackend?.paymentStatus ?? estudianteBackend?.payment_status ?? '').toLowerCase();
  const montoPago = normalizarMontoPago(estudianteBackend?.paidAmount ?? estudianteBackend?.paid_amount ?? 0);

  const pagos = Object.entries(pagosRegistrados)
    .filter(([, pago]) => pago && typeof pago === 'object')
    .map(([periodo, pago]) => ({
      periodo,
      status: String(pago.status || 'no_pago').toLowerCase(),
      amount: normalizarMontoPago(pago.amount ?? pago.monto ?? 0),
      date: pago.date || '',
    }));

  if (!pagos.length && (estadoPago === 'pago' || estadoPago === 'abono')) {
    pagos.push({
      periodo: 'actual',
      status: estadoPago,
      amount: montoPago,
      date: '',
    });
  }

  const pagosFiltrados = pagos
    .filter((pago) => pago.status === 'pago' || pago.status === 'abono')
    .sort((first, second) => {
      if (first.periodo === 'inscripcion') return second.periodo === 'inscripcion' ? 0 : -1;
      if (second.periodo === 'inscripcion') return 1;
      return String(first.date || '').localeCompare(String(second.date || ''));
    });

  const cedulaKey = obtenerClaveEstudiante(datosEstudianteActual, 'cedula');
  const obtenerMontoPago = (pago) => normalizarMontoPago(pago.amount) || (pago.status === 'pago' ? 30 : 0);
  const nombrePeriodo = periodo => PERIODOS_PAGO.find(item => item.id === periodo)?.label || periodo;

  document.getElementById('reciboEstudianteNombre').textContent = datosEstudianteActual.Nombre;
  document.getElementById('reciboEstudianteCedula').textContent = datosEstudianteActual[cedulaKey] || estudianteBackend?.cedula || 'No registrada';
  document.getElementById('reciboEstudianteAno').textContent = datosEstudianteActual[obtenerClaveEstudiante(datosEstudianteActual, 'ano')] || `${anoEstudiante}° Año`;

  document.getElementById('reciboEstudiantePagosBody').innerHTML = pagosFiltrados.length
    ? pagosFiltrados.map((pago) => {
      const montoPagado = obtenerMontoPago(pago);
      const montoAbono = pago.status === 'abono'
        ? `$${montoPagado.toFixed(2)} (Abono)`
        : '- (Pago completo)';
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${nombrePeriodo(pago.periodo)}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${pago.date || 'Sin fecha'}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${montoAbono}</td><td class="recibo-amount">$${montoPagado.toFixed(2)}</td></tr>`;
    }).join('')
    : '<tr><td colspan="4" style="padding: 15px; text-align: center;">No hay pagos registrados.</td></tr>';

  const totalPagado = pagosFiltrados.reduce((total, pago) => total + obtenerMontoPago(pago), 0);
  document.getElementById('reciboEstudianteTotal').textContent = totalPagado.toFixed(2);
};

window.cerrarSesion = () => {
  datosEstudianteActual = null;
  boletaAutorizadaActual = false;
  const mainView = document.getElementById('mainView');
  const landingView = document.getElementById('landingView');
  const loginForm = document.getElementById('loginEstudianteForm');
  const cedulaInput = document.getElementById('estudianteCedula');
  const errorMensaje = document.getElementById('errorMensaje');

  window.history.replaceState({}, '', PORTAL_BASE_PATH);
  mainView.style.display = 'none';
  mainView.classList.add('hidden');
  landingView.classList.remove('hidden');
  landingView.style.display = 'flex';
  if (loginForm) loginForm.reset();
  if (errorMensaje) errorMensaje.style.display = 'none';
  document.getElementById('boletaBloqueada').style.display = 'none';
  landingView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (cedulaInput) cedulaInput.focus();
};