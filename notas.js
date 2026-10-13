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
const studentsHead = document.getElementById('studentsHead');
const activityList = document.getElementById('activityList');
const addActivityButton = document.getElementById('addActivity');
const assessmentTotal = document.getElementById('assessmentTotal');
const studentCount = document.getElementById('studentCount');
const statusMessage = document.getElementById('statusMessage');
const saveButton = document.getElementById('saveGrades');
const studentSearch = document.getElementById('studentSearch');

let currentUser;
let students = [];
let previousFilters = {};
let activities = [];
let originalActivities = [];
let draftScores = {};
let originalScores = {};

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

const createActivityId = () => `activity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const copyJson = (value) => JSON.parse(JSON.stringify(value));

const distributeActivityWeights = () => {
  if (!activities.length) return;
  const weight = Math.floor((10000 / activities.length)) / 100;
  const remainder = Math.round((100 - weight * activities.length) * 100) / 100;
  activities.forEach((activity, index) => {
    activity.weight = index === activities.length - 1
      ? Math.round((weight + remainder) * 100) / 100
      : weight;
  });
};

const captureDraftScores = () => {
  studentsBody.querySelectorAll('.grade-input').forEach((input) => {
    const { studentId, activityId } = input.dataset;
    if (!draftScores[studentId]) draftScores[studentId] = {};
    draftScores[studentId][activityId] = input.value;
  });
};

const getWeightedGrade = (studentId) => {
  const scores = draftScores[studentId] || {};
  let weightedTotal = 0;
  let weightTotal = 0;
  activities.forEach((activity) => {
    const score = scores[activity.id];
    const weight = Number(activity.weight);
    if (score !== '' && Number.isFinite(Number(score)) && Number.isFinite(weight) && weight > 0) {
      weightedTotal += Number(score) * weight;
      weightTotal += weight;
    }
  });
  if (!weightTotal) return null;
  const weightedGrade = weightedTotal / weightTotal;
  return Math.floor(weightedGrade) + (weightedGrade % 1 >= 0.5 ? 1 : 0);
};

const updateAssessmentTotal = () => {
  const total = activities.reduce((sum, activity) => sum + (Number(activity.weight) || 0), 0);
  assessmentTotal.textContent = `Ponderación total: ${Number(total.toFixed(2))}% (máximo 100%).`;
  assessmentTotal.classList.toggle('error', total > 100);
};

const updateTableHeaders = () => {
  const row = studentsHead.rows[0];
  while (row.cells.length > 2) row.deleteCell(row.cells.length - 1);
  activities.forEach((activity) => {
    const heading = document.createElement('th');
    heading.scope = 'col';
    heading.className = 'assessment-column';
    heading.dataset.activityId = activity.id;
    const content = document.createElement('span');
    content.className = 'assessment-heading';
    const name = document.createElement('span');
    name.textContent = activity.name || 'Actividad sin nombre';
    const weight = document.createElement('span');
    weight.textContent = `${Number(activity.weight) || 0}%`;
    content.append(name, weight);
    heading.appendChild(content);
    row.appendChild(heading);
  });
  const gradeHeading = document.createElement('th');
  gradeHeading.id = 'gradeHeading';
  gradeHeading.scope = 'col';
  gradeHeading.textContent = `Nota ponderada (${PERIOD_LABELS[periodSelect.value]})`;
  row.appendChild(gradeHeading);
};

const updateCalculatedGrades = () => {
  studentsBody.querySelectorAll('tr[data-student-id]').forEach((row) => {
    const grade = getWeightedGrade(row.dataset.studentId);
    row.querySelector('.calculated-grade').textContent = grade === null ? '-' : String(grade);
  });
};

const renderActivityEditor = () => {
  activityList.replaceChildren();
  activities.forEach((activity) => {
    const item = document.createElement('div');
    item.className = 'assessment-item';
    item.dataset.activityId = activity.id;

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Nombre de la actividad';
    const nameInput = document.createElement('input');
    nameInput.className = 'activity-name-input';
    nameInput.type = 'text';
    nameInput.maxLength = 120;
    nameInput.required = true;
    nameInput.value = activity.name;
    nameInput.setAttribute('aria-label', 'Nombre de la actividad');
    nameLabel.appendChild(nameInput);

    const weightLabel = document.createElement('label');
    weightLabel.textContent = 'Porcentaje de evaluación';
    const weightInput = document.createElement('input');
    weightInput.className = 'activity-weight-input';
    weightInput.type = 'number';
    weightInput.min = '0';
    weightInput.max = '100';
    weightInput.step = '0';
    weightInput.required = true;
    weightInput.value = String(activity.weight);
    weightInput.setAttribute('aria-label', `Porcentaje para ${activity.name || 'actividad'}`);
    weightLabel.appendChild(weightInput);

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-activity-button';
    removeButton.type = 'button';
    removeButton.textContent = 'Quitar';
    removeButton.disabled = activities.length === 1;
    removeButton.setAttribute('aria-label', `Quitar ${activity.name || 'actividad'}`);
    item.append(nameLabel, weightLabel, removeButton);
    activityList.appendChild(item);
  });
  updateAssessmentTotal();
  updateTableHeaders();
  updateCalculatedGrades();
};

const loadGradeContext = () => {
  const subject = currentSubject();
  const period = periodSelect.value;
  const subjectGrades = (student) => student.grades?.[subject?.id] || {};
  const configured = students
    .map((student) => subjectGrades(student).assessments?.[period])
    .find((entries) => Array.isArray(entries) && entries.length);

  if (configured) {
    activities = configured.map((entry) => ({
      id: String(entry.id || createActivityId()),
      name: String(entry.name || ''),
      weight: Number(entry.weight) || 0,
    }));
    const totalWeight = activities.reduce((total, activity) => total + activity.weight, 0);
    if (Math.abs(totalWeight - 100) > 0) distributeActivityWeights();
  } else {
    const legacyName = students
      .map((student) => subjectGrades(student).activityNames?.[period])
      .find((name) => typeof name === 'string' && name.trim());
    activities = [{ id: 'activity-1', name: legacyName || 'Actividad 1', weight: 100 }];
  }

  draftScores = {};
  students.forEach((student) => {
    const studentId = String(student.id);
    const grades = subjectGrades(student);
    const persistedActivities = grades.assessments?.[period];
    draftScores[studentId] = {};
    activities.forEach((activity, index) => {
      const persistedActivity = Array.isArray(persistedActivities)
        ? persistedActivities.find((entry) => String(entry.id) === activity.id)
        : null;
      if (persistedActivity && Object.prototype.hasOwnProperty.call(persistedActivity, 'score')) {
        draftScores[studentId][activity.id] = persistedActivity.score === null ? '' : String(persistedActivity.score);
      } else if (!persistedActivities?.length && index === 0) {
        const legacyValue = Object.prototype.hasOwnProperty.call(grades, period)
          ? grades[period]
          : getSheetGrade(student.sheetRecord, subject?.id, period);
        draftScores[studentId][activity.id] = legacyValue === null ? '' : String(legacyValue || '').replace(',', '.');
      } else {
        draftScores[studentId][activity.id] = '';
      }
    });
  });

  originalActivities = copyJson(activities);
  originalScores = copyJson(draftScores);
  renderActivityEditor();
  renderStudents();
};

const hasUnsavedChanges = () => {
  captureDraftScores();
  return JSON.stringify(activities) !== JSON.stringify(originalActivities)
    || JSON.stringify(draftScores) !== JSON.stringify(originalScores);
};

const confirmDiscardChanges = () => !hasUnsavedChanges()
  || window.confirm('Hay actividades o notas sin guardar. ¿Descartar esos cambios?');

const renderStudents = () => {
  const subject = currentSubject();
  const period = periodSelect.value;
  document.getElementById('listTitle').textContent = subject
    ? `Año ${yearSelect.value} · ${subject.label} · ${PERIOD_LABELS[period]}`
    : 'Lista de estudiantes';
  updateTableHeaders();
  studentsBody.replaceChildren();

  if (!students.length) {
    const row = studentsBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = activities.length + 3;
    cell.className = 'empty';
    cell.textContent = 'No hay estudiantes registrados en este año.';
  } else {
    students.forEach((student, index) => {
      const row = studentsBody.insertRow();
      const studentId = String(student.id);
      row.dataset.studentId = studentId;
      const numberCell = row.insertCell();
      numberCell.dataset.label = 'N.º de lista';
      numberCell.textContent = String(index + 1);
      const nameCell = row.insertCell();
      nameCell.className = 'student-name';
      nameCell.dataset.label = 'Nombre del estudiante';
      nameCell.textContent = student.name || 'Estudiante sin nombre';
      activities.forEach((activity) => {
        const gradeCell = row.insertCell();
        gradeCell.dataset.label = `${activity.name || 'Actividad'} (${Number(activity.weight) || 0}%)`;
        const input = document.createElement('input');
        input.className = 'grade-input';
        input.type = 'number';
        input.min = '1';
        input.max = '20';
        input.step = '0';
        input.inputMode = 'decimal';
        input.dataset.studentId = studentId;
        input.dataset.activityId = activity.id;
        input.value = draftScores[studentId]?.[activity.id] || '';
        input.setAttribute('aria-label', `Nota de ${student.name || 'estudiante'} en ${activity.name || 'actividad'}`);
        gradeCell.appendChild(input);
      });
      const calculatedCell = row.insertCell();
      calculatedCell.className = 'calculated-grade';
      calculatedCell.dataset.label = `Nota ponderada (${PERIOD_LABELS[period]})`;
      const grade = getWeightedGrade(studentId);
      calculatedCell.textContent = grade === null ? '-' : String(grade);
    });
  }

  studentCount.textContent = `${students.length} estudiante${students.length === 1 ? '' : 's'}`;
  filterStudents();
};

const loadStudents = async () => {
  studentsBody.innerHTML = '<tr><td class="empty" colspan="4">Cargando estudiantes...</td></tr>';
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
  loadGradeContext();
  if (sheetWarning) setStatus(sheetWarning, 'error');
};

const filterStudents = () => {
  const search = normalizeText(studentSearch.value);
  let visibleCount = 0;
  studentsBody.querySelectorAll('tr[data-student-id]').forEach((row) => {
    const visible = normalizeText(row.querySelector('.student-name')?.textContent).includes(search);
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

  captureDraftScores();
  if (!activities.length || activities.some((activity) => !activity.name.trim())) {
    setStatus('Escribe un nombre para cada actividad.', 'error');
    return;
  }

  const weights = activities.map((activity) => Number(activity.weight));
  const totalWeight = weights.reduce((total, weight) => total + (Number.isFinite(weight) ? weight : 0), 0);
  if (weights.some((weight) => !Number.isFinite(weight) || weight <= 0 || weight > 100) || totalWeight > 100) {
    setStatus('Cada porcentaje debe ser mayor que 0 y la suma de las actividades no puede superar 100%.', 'error');
    return;
  }

  const invalidScore = Object.entries(draftScores).some(([studentId, scores]) => activities.some((activity) => {
    const score = scores[activity.id];
    if (score === '') return false;
    const parsedScore = Number(score);
    if (Number.isFinite(parsedScore) && parsedScore >= 1 && parsedScore <= 20) return false;
    const input = Array.from(studentsBody.querySelectorAll('.grade-input')).find((item) => (
      item.dataset.studentId === studentId && item.dataset.activityId === activity.id
    ));
    input?.focus();
    setStatus('Cada nota debe estar entre 1 y 20. Deja el campo vacío si quieres quitar una nota.', 'error');
    return true;
  }));
  if (invalidScore) return;

  if (!students.length) {
    setStatus('No hay estudiantes donde guardar estas actividades.', 'error');
    return;
  }

  saveButton.disabled = true;
  addActivityButton.disabled = true;
  activityList.querySelectorAll('input, button').forEach((control) => {
    control.disabled = true;
  });
  studentsBody.querySelectorAll('.grade-input').forEach((input) => {
    input.disabled = true;
  });
  setStatus('Guardando actividades y notas...');
  let savedCount = 0;
  const errors = [];
  for (const student of students) {
    const grades = copyJson(student.grades || {});
    const subjectGrades = { ...(grades[subject.id] || {}) };
    const savedAssessments = { ...(subjectGrades.assessments || {}) };
    const assessmentEntries = activities.map((activity) => ({
      id: activity.id,
      name: activity.name.trim(),
      weight: Number(activity.weight),
      score: draftScores[String(student.id)]?.[activity.id] === ''
        ? null
        : Number(draftScores[String(student.id)]?.[activity.id]),
    }));
    savedAssessments[periodSelect.value] = assessmentEntries;
    subjectGrades.assessments = savedAssessments;
    subjectGrades[periodSelect.value] = getWeightedGrade(String(student.id));
    grades[subject.id] = subjectGrades;
    try {
      const response = await fetch(API_STUDENTS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, grades }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Error ${response.status}`);
      student.grades = result.grades || grades;
      savedCount += 1;
    } catch (error) {
      console.error(`No se pudieron guardar las notas de ${student.name}:`, error);
      errors.push(student.name || String(student.id));
    }
  }

  saveButton.disabled = false;
  addActivityButton.disabled = false;
  activityList.querySelectorAll('input, button').forEach((control) => {
    control.disabled = false;
  });
  if (activities.length === 1) activityList.querySelector('.remove-activity-button').disabled = true;
  studentsBody.querySelectorAll('.grade-input').forEach((input) => {
    input.disabled = false;
  });
  if (errors.length) {
    setStatus(`Se guardaron ${savedCount} estudiante(s), pero falló el guardado de: ${errors.join(', ')}.`, 'error');
  } else {
    originalActivities = copyJson(activities);
    originalScores = copyJson(draftScores);
    setStatus(`Actividades y notas guardadas. Nota ponderada actualizada para ${savedCount} estudiante(s).`, 'success');
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
    if (!updateSubjects()) {
      setStatus('Tu perfil no tiene materias asignadas para este año.', 'error');
      return;
    }
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
    loadGradeContext();
  };
  subjectSelect.addEventListener('change', updateSelectedFilters);
  periodSelect.addEventListener('change', updateSelectedFilters);
  studentSearch.addEventListener('input', filterStudents);
  activityList.addEventListener('input', (event) => {
    const item = event.target.closest('.assessment-item');
    if (!item) return;
    const activity = activities.find((entry) => entry.id === item.dataset.activityId);
    if (!activity) return;
    if (event.target.matches('.activity-name-input')) activity.name = event.target.value;
    if (event.target.matches('.activity-weight-input')) {
      activity.weight = event.target.value === '' ? '' : Number(event.target.value);
    }
    updateAssessmentTotal();
    updateTableHeaders();
    updateCalculatedGrades();
    studentsBody.querySelectorAll('tr[data-student-id]').forEach((row) => {
      const activityIndex = activities.findIndex((entry) => entry.id === activity.id);
      const cell = row.cells[activityIndex + 2];
      if (cell) cell.dataset.label = `${activity.name || 'Actividad'} (${Number(activity.weight) || 0}%)`;
    });
  });
  activityList.addEventListener('click', (event) => {
    const button = event.target.closest('.remove-activity-button');
    if (!button) return;
    if (!window.confirm('¿Quitar esta actividad y las notas registradas para ella?')) return;
    captureDraftScores();
    const item = button.closest('.assessment-item');
    const activityId = item?.dataset.activityId;
    activities = activities.filter((activity) => activity.id !== activityId);
    distributeActivityWeights();
    Object.values(draftScores).forEach((scores) => delete scores[activityId]);
    renderActivityEditor();
    renderStudents();
  });
  addActivityButton.addEventListener('click', () => {
    captureDraftScores();
    const activity = { id: createActivityId(), name: `Actividad ${activities.length + 1}`, weight: 25 };
    activities.push(activity);
    distributeActivityWeights();
    students.forEach((student) => {
      const studentId = String(student.id);
      if (!draftScores[studentId]) draftScores[studentId] = {};
      draftScores[studentId][activity.id] = '';
    });
    renderActivityEditor();
    renderStudents();
    activityList.querySelector(`[data-activity-id="${activity.id}"] .activity-name-input`).focus();
  });
  studentsBody.addEventListener('input', (event) => {
    if (!event.target.matches('.grade-input')) return;
    const { studentId, activityId } = event.target.dataset;
    if (!draftScores[studentId]) draftScores[studentId] = {};
    draftScores[studentId][activityId] = event.target.value;
    const row = event.target.closest('tr');
    const grade = getWeightedGrade(studentId);
    row.querySelector('.calculated-grade').textContent = grade === null ? '-' : String(grade);
  });
  saveButton.addEventListener('click', saveGrades);

  try {
    await loadStudents();
  } catch (error) {
    console.error('No se pudieron cargar estudiantes:', error);
    students = [];
    loadGradeContext();
    setStatus(error.message || 'No se pudieron cargar los estudiantes.', 'error');
  }
};

initialize();
