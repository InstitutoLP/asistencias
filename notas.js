const API_STUDENTS = `${window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin}/api/students`;
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR2dzgdf5bWl2KBYcGTWxjjiIk6qKQ5NWjde1eyiv0Gy0velu_8JTPdu8O8WicEJQ/pub?output=csv';
const PERIOD_LABELS = { '1er': '1er lapso', '2do': '2do lapso', '3er': '3er lapso', Final: 'Final' };
const SUBJECTS_BY_YEAR = {
  1: [
    { id: 'matematicas', label: 'Matemáticas' }, { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' }, { id: 'frances', label: 'Francés' },
    { id: 'educacion-fisica', label: 'Educación Física' }, { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' }, { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'crp', label: 'CRP' },
  ],
  2: [
    { id: 'matematicas', label: 'Matemáticas' }, { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' }, { id: 'frances', label: 'Francés' },
    { id: 'educacion-fisica', label: 'Educación Física' }, { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' }, { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'crp', label: 'CRP' },
  ],
  3: [
    { id: 'castellano', label: 'Castellano' }, { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' }, { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' }, { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' }, { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' }, { id: 'crp', label: 'CRP' },
  ],
  4: [
    { id: 'castellano', label: 'Castellano' }, { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' }, { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' }, { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' }, { id: 'ghc', label: 'GHC' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'frances', label: 'Francés' },
  ],
  5: [
    { id: 'castellano', label: 'Castellano' }, { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' }, { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' }, { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' }, { id: 'ciencias-tierra', label: 'Ciencias de la Tierra' },
    { id: 'ghc', label: 'GHC' }, { id: 'frances', label: 'Francés' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' }, { id: 'crp', label: 'CRP' },
  ],
};
const SHEET_SUBJECT_ALIASES = {
  matematica: ['matematica', 'matematicas'],
  matematicas: ['matematica', 'matematicas'],
  fisica: ['fisica'],
  quimica: ['quimica'],
  biologia: ['biologia'],
  'ciencias-tierra': ['ciencias de la tierra'],
  'educacion-fisica': ['educacion fisica'],
  'arte-patrimonio': ['arte y patrimonio'],
  'ciencias-naturales': ['ciencias naturales'],
  'orientacion-convivencia': ['orientacion y convivencia'],
  'formacion-soberania': ['formacion para la soberania'],
  frances: ['frances'],
  crp: ['frances', 'crp'],
};

const yearSelect = document.getElementById('yearSelect');
const subjectSelect = document.getElementById('subjectSelect');
const periodSelect = document.getElementById('periodSelect');
const studentsBody = document.getElementById('studentsBody');
const studentCount = document.getElementById('studentCount');
const statusMessage = document.getElementById('statusMessage');
const saveButton = document.getElementById('saveGrades');
const studentSearch = document.getElementById('studentSearch');

let currentUser;
let students = [];
let previousFilters = {};

const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const normalizeCedula = (value) => String(value || '').toUpperCase().replace(/\D/g, '');

const setStatus = (message, type = '') => {
  statusMessage.textContent = message;
  statusMessage.className = `status${type ? ` ${type}` : ''}`;
};

const parseCsvLine = (line) => {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
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

const loadSheetRows = async () => {
  const response = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`La hoja de notas respondió con ${response.status}.`);
  const lines = (await response.text()).split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ''));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] || '';
      return record;
    }, {});
  });
};

const getRecordValue = (record, fragments) => {
  const key = Object.keys(record || {}).find((header) => fragments.some((fragment) => normalizeText(header).includes(fragment)));
  return key ? record[key] : '';
};

const matchSheetRecord = (student, sheetRows) => {
  const studentId = normalizeCedula(student.cedula);
  const studentName = normalizeText(student.name);
  return sheetRows.find((row) => {
    const rowId = normalizeCedula(getRecordValue(row, ['cedula', 'identificacion']));
    const rowName = normalizeText(getRecordValue(row, ['nombre', 'estudiante']));
    return (studentId && rowId && studentId === rowId)
      || (!(studentId && rowId) && studentName && rowName === studentName);
  });
};

const getSheetGrade = (record, subjectId, period) => {
  if (!record) return '';
  const subjectAliases = SHEET_SUBJECT_ALIASES[subjectId] || [subjectId.replace(/-/g, ' ')];
  const column = Object.keys(record).find((header) => {
    const normalizedHeader = normalizeText(header).replace(/\s+/g, '');
    return subjectAliases.some((alias) => normalizedHeader === normalizeText(`${alias}_${period}`).replace(/\s+/g, ''));
  });
  return column ? String(record[column] || '') : '';
};

const getAllowedYears = () => {
  const years = Array.isArray(currentUser.allowedYears) ? currentUser.allowedYears.map(Number) : [1, 2, 3, 4, 5];
  return years.filter((year) => Number.isInteger(year) && year >= 1 && year <= 5);
};

const getSubjectsForYear = (year) => {
  const subjects = SUBJECTS_BY_YEAR[Number(year)] || [];
  const allowedByYear = currentUser.allowedSubjectsByYear?.[Number(year)];
  const allowed = allowedByYear || currentUser.allowedSubjects;
  return !Array.isArray(allowed) || allowed.includes('todas')
    ? subjects
    : subjects.filter((subject) => allowed.includes(subject.id));
};

const currentSubject = () => getSubjectsForYear(yearSelect.value).find((subject) => subject.id === subjectSelect.value);

const hasUnsavedChanges = () => Array.from(studentsBody.querySelectorAll('.grade-input'))
  .some((input) => input.value !== input.dataset.original);

const confirmDiscardChanges = () => !hasUnsavedChanges()
  || window.confirm('Hay notas sin guardar. ¿Descartar esos cambios?');

const renderStudents = () => {
  const subject = currentSubject();
  const period = periodSelect.value;
  document.getElementById('listTitle').textContent = subject
    ? `Año ${yearSelect.value} · ${subject.label} · ${PERIOD_LABELS[period]}`
    : 'Lista de estudiantes';
  document.getElementById('gradeHeading').textContent = `Nota (1-20) - ${PERIOD_LABELS[period]}`;
  studentsBody.replaceChildren();

  if (!students.length) {
    const row = studentsBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 2;
    cell.className = 'empty';
    cell.textContent = 'No hay estudiantes registrados en este año.';
  } else {
    students.forEach((student) => {
      const row = studentsBody.insertRow();
      row.dataset.studentId = String(student.id);
      const nameCell = row.insertCell();
      nameCell.className = 'student-name';
      nameCell.textContent = student.name || 'Estudiante sin nombre';
      const gradeCell = row.insertCell();
      const input = document.createElement('input');
      input.className = 'grade-input';
      input.type = 'number';
      input.min = '1';
      input.max = '20';
      input.step = '0.01';
      input.inputMode = 'decimal';
      input.setAttribute('aria-label', `Nota de ${student.name || 'estudiante'}`);
      const subjectGrades = student.grades?.[subject?.id] || {};
      const hasPersistedGrade = Object.prototype.hasOwnProperty.call(subjectGrades, period);
      const persisted = subjectGrades[period];
      const existingSheetGrade = getSheetGrade(student.sheetRecord, subject?.id, period);
      input.value = String(hasPersistedGrade ? (persisted ?? '') : existingSheetGrade).replace(',', '.');
      input.dataset.original = input.value;
      gradeCell.appendChild(input);
    });
  }

  studentCount.textContent = `${students.length} estudiante${students.length === 1 ? '' : 's'}`;
  filterStudents();
};

const loadStudents = async () => {
  studentsBody.innerHTML = '<tr><td class="empty" colspan="2">Cargando estudiantes...</td></tr>';
  studentCount.textContent = 'Cargando estudiantes...';
  setStatus('');

  const year = yearSelect.value;
  const response = await fetch(`${API_STUDENTS}?year=${encodeURIComponent(year)}&t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });
  const responseData = await response.json().catch(() => []);
  if (!response.ok) {
    throw new Error(responseData.error || `No se pudieron cargar los estudiantes (${response.status}).`);
  }
  if (!Array.isArray(responseData)) throw new Error('El servidor devolvió una lista de estudiantes inválida.');

  let sheetRows = [];
  let sheetWarning = '';
  try {
    sheetRows = await loadSheetRows();
  } catch (error) {
    console.error('No se pudieron leer las notas existentes desde la hoja:', error);
    sheetWarning = 'No se pudieron leer las notas actuales de Excel; se muestran las notas guardadas en el sistema.';
  }

  students = responseData.map((student) => ({
    ...student,
    grades: student.grades && typeof student.grades === 'object' ? student.grades : {},
    sheetRecord: matchSheetRecord(student, sheetRows),
  }));
  renderStudents();
  if (sheetWarning) setStatus(sheetWarning, 'error');
};

const filterStudents = () => {
  const search = normalizeText(studentSearch.value);
  let visibleCount = 0;
  studentsBody.querySelectorAll('tr[data-student-id]').forEach((row) => {
    const visible = normalizeText(row.cells[0]?.textContent).includes(search);
    row.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  if (students.length && !visibleCount) {
    studentCount.textContent = 'No hay estudiantes que coincidan con la búsqueda.';
  } else if (students.length) {
    studentCount.textContent = `${visibleCount} de ${students.length} estudiante${students.length === 1 ? '' : 's'}`;
  }
};

const saveGrades = async () => {
  const subject = currentSubject();
  if (!subject) {
    setStatus('Selecciona una materia válida.', 'error');
    return;
  }

  const changedRows = Array.from(studentsBody.querySelectorAll('tr[data-student-id]'))
    .map((row) => ({ row, student: students.find((item) => String(item.id) === row.dataset.studentId), input: row.querySelector('.grade-input') }))
    .filter(({ input }) => input && input.value !== input.dataset.original);

  if (!changedRows.length) {
    setStatus('No hay cambios pendientes para guardar.');
    return;
  }

  const invalidRow = changedRows.find(({ input }) => input.value !== '' && (!Number.isFinite(input.valueAsNumber) || input.valueAsNumber < 1 || input.valueAsNumber > 20));
  if (invalidRow) {
    invalidRow.input.focus();
    setStatus('Cada nota debe estar entre 1 y 20. Deja el campo vacío si quieres borrar una nota.', 'error');
    return;
  }

  saveButton.disabled = true;
  setStatus('Guardando notas...');
  let savedCount = 0;
  const errors = [];
  for (const { student, input } of changedRows) {
    const grades = JSON.parse(JSON.stringify(student.grades || {}));
    grades[subject.id] = { ...(grades[subject.id] || {}) };
    if (input.value === '') {
      grades[subject.id][periodSelect.value] = null;
    } else {
      grades[subject.id][periodSelect.value] = input.valueAsNumber;
    }

    try {
      const response = await fetch(API_STUDENTS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, grades }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
      student.grades = result.grades || grades;
      const savedSubjectGrades = student.grades?.[subject.id] || {};
      input.value = savedSubjectGrades[periodSelect.value] ?? '';
      input.dataset.original = input.value;
      savedCount += 1;
    } catch (error) {
      console.error(`No se pudieron guardar las notas de ${student.name}:`, error);
      errors.push(student.name || String(student.id));
    }
  }

  saveButton.disabled = false;
  if (errors.length) {
    setStatus(`Se guardaron ${savedCount} estudiante(s), pero falló el guardado de: ${errors.join(', ')}.`, 'error');
  } else {
    setStatus(`Notas guardadas correctamente para ${savedCount} estudiante(s).`, 'success');
  }
};

const initialize = async () => {
  try {
    currentUser = JSON.parse(sessionStorage.getItem('activeUser') || 'null');
  } catch (error) {
    console.error('No se pudo leer la sesión del profesor:', error);
    window.location.replace('index.html');
    return;
  }

  if (!currentUser?.name || currentUser.soloAdmin || currentUser.soloReportes) {
    window.location.replace('index.html');
    return;
  }

  document.getElementById('teacherName').textContent = currentUser.name;
  const years = getAllowedYears();
  if (!years.length) {
    setStatus('Tu perfil no tiene años escolares asignados.', 'error');
    return;
  }

  years.forEach((year) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = `Año ${year}`;
    yearSelect.appendChild(option);
  });

  const updateSubjects = () => {
    const subjects = getSubjectsForYear(yearSelect.value);
    subjectSelect.replaceChildren();
    subjects.forEach((subject) => {
      const option = document.createElement('option');
      option.value = subject.id;
      option.textContent = subject.label;
      subjectSelect.appendChild(option);
    });
    if (!subjects.length) {
      subjectSelect.disabled = true;
      return false;
    }
    subjectSelect.disabled = false;
    return true;
  };

  if (!updateSubjects()) {
    setStatus('Tu perfil no tiene materias asignadas para este año.', 'error');
    return;
  }
  previousFilters = { year: yearSelect.value, subject: subjectSelect.value, period: periodSelect.value };
  document.getElementById('teacherName').textContent = currentUser.name;

  yearSelect.addEventListener('change', async () => {
    if (!confirmDiscardChanges()) {
      yearSelect.value = previousFilters.year;
      return;
    }
    updateSubjects();
    previousFilters = { year: yearSelect.value, subject: subjectSelect.value, period: periodSelect.value };
    try {
      await loadStudents();
    } catch (error) {
      console.error('No se pudieron cargar estudiantes:', error);
      setStatus(error.message, 'error');
    }
  });

  const updateSelectedFilters = () => {
    if (!confirmDiscardChanges()) {
      subjectSelect.value = previousFilters.subject;
      periodSelect.value = previousFilters.period;
      return;
    }
    previousFilters = { year: yearSelect.value, subject: subjectSelect.value, period: periodSelect.value };
    renderStudents();
  };
  subjectSelect.addEventListener('change', updateSelectedFilters);
  periodSelect.addEventListener('change', updateSelectedFilters);
  studentSearch.addEventListener('input', filterStudents);
  saveButton.addEventListener('click', saveGrades);

  try {
    await loadStudents();
  } catch (error) {
    console.error('No se pudieron cargar estudiantes:', error);
    students = [];
    renderStudents();
    setStatus(error.message || 'No se pudieron cargar los estudiantes.', 'error');
  }
};

initialize();
