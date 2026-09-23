const SENDER_WHATSAPP_NUMBER = '04142475155';
const DEFAULT_PHONE = '04125486575';
const DEFAULT_MESSAGE = 'La estudiante Arianny Suarez está asistente';
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_SEND_WHATSAPP = `${API_BASE_URL}/api/send-whatsapp`;
const API_SEND_EMAIL = `${API_BASE_URL}/api/send-email`;
const API_STUDENTS = `${API_BASE_URL}/api/students`;
const API_ATTENDANCE = `${API_BASE_URL}/api/attendance`;
const deletedStudentIds = new Set();

const isRemovedStudent = (student) => deletedStudentIds.has(String(student?.id));

let currentUser = null; 

console.log('DOM detectado:', {
  loginForm: document.getElementById('loginForm'),
  yearSelect: document.getElementById('yearSelect'),
  landingView: document.getElementById('landingView')
});


const TEACHERS = {
  "Sara Romero": {
    password: "20330592",
    name: "Administrador de Sistema",
    soloAdmin: true
  },
  "Nestor Pérez": {
    password: "13557016",
    name: "Prof: Néstor",
    allowedYears: [1, 2, 3, 4, 5],
    puedeAgregarEstudiantes: true,
    esAdmin: true,
    puedeGestionarBoletas: true
  },
  "Andy Suárez": {
    password: "14965485",
    name: "Prof: Andy",
    allowedYears: [1, 2, 3, 4, 5],
    puedeAgregarEstudiantes: true,
    esAdmin: false
  },
  "Miriam Ariza": {
    password: "10794599",
    name: "Prof: Miriam",
    allowedYears: [1, 2, 3, 4, 5],
    allowedSubjects: ['orientacion-convivencia'],
    allowedSubjectsByYear: {
      3: ['orientacion-convivencia', 'crp'],
    },
    puedeAgregarEstudiantes: false
  },
  "Tibisay Plaza": {
    password: "16226428",
    name: "Prof: Tibisay",
    allowedYears: [1, 2], 
    allowedSubjects: ['matematicas'],
    puedeAgregarEstudiantes: false
  },
  "Rubén Lyon": {
    password: "16706376",
    name: "Prof: Rubén",
    allowedYears: [3, 4, 5], 
    allowedSubjects: ['matematicas','quimica'],
    puedeAgregarEstudiantes: false
  },
"Nancy Figueredo": {
    password: "11851547",
    name: "Prof: Nancy",
    allowedYears: [5],
    allowedSubjects: ['biologia','ciencias-tierra'],
    puedeAgregarEstudiantes: false
  },
  "Yubisay Hernandez": {
    password: "15039005",
    name: "Prof: Yubisay",
    allowedYears: [1, 2,3, 4, 5], 
    allowedSubjects: ['castellano'],
    puedeAgregarEstudiantes: false
  },
  "Lenis Ávila": {
    password: "6845543",
    name: "Prof: Lenis",
    allowedYears: [3, 4, 5], 
    allowedSubjects: ['ingles'],
    puedeAgregarEstudiantes: false
  },
  "Jhoanna Pedrón": {
    password: "11569235",
    name: "Prof: Jhoanna",
    allowedYears: [1, 2, 3, 4, 5], 
    allowedSubjects: ['frances'],
    puedeAgregarEstudiantes: false
  },
  "José Rengifo": {
    password: "17348702",
    name: "Prof: José",
    allowedYears: [1, 2, 3, 4, 5], 
    allowedSubjects: ['educacion-fisica', 'formacion-soberania'],
    puedeAgregarEstudiantes: false
  },
  "Lidis Hernández": {
    password: "13312907",
    name: "Prof: Lidis",
    allowedYears: [1, 2], 
    allowedSubjects: ['ingles'],
    puedeAgregarEstudiantes: false
  },
  "Yoxelith Camaripano": {
    password: "16005056",
    name: "Prof: Yoxelith",
    allowedYears: [1, 2, 3, 4], 
    allowedSubjects: ['ciencias-naturales', 'biologia'],
    puedeAgregarEstudiantes: false
  },
  "Alexis Serrano": {
    password: "13119709",
    name: "Prof: Alexis",
    allowedYears: [1, 2, 3, 4, 5], 
    allowedSubjects: ['ghc'],
    puedeAgregarEstudiantes: false
  },
  "María Rodríguez": {
    password: "15551727",
    name: "Prof: María",
    allowedYears: [1, 2], 
    allowedSubjects: ['arte-patrimonio'],
    puedeAgregarEstudiantes: false
  },
};

const SUBJECTS_BY_YEAR = {
  1: [
    { id: 'matematicas', label: 'Matemáticas' },
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
  2: [
    { id: 'matematicas', label: 'Matemáticas' },
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'arte-patrimonio', label: 'Arte y Patrimonio' },
    { id: 'ciencias-naturales', label: 'Ciencias Naturales' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
  3: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ghc', label: 'GHC' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' },
    { id: 'crp', label: 'CRP' },
  ],
  4: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ghc', label: 'GHC' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'frances', label: 'Francés' },
  ],
  5: [
    { id: 'castellano', label: 'Castellano' },
    { id: 'ingles', label: 'Inglés' },
    { id: 'matematica', label: 'Matemática' },
    { id: 'educacion-fisica', label: 'Educación Física' },
    { id: 'fisica', label: 'Física' },
    { id: 'quimica', label: 'Química' },
    { id: 'biologia', label: 'Biología' },
    { id: 'ciencias-tierra', label: 'Ciencias de la Tierra' },
    { id: 'ghc', label: 'GHC' },
    { id: 'formacion-soberania', label: 'Formación para la Soberanía' },
    { id: 'orientacion-convivencia', label: 'Orientación y Convivencia' },
    { id: 'crp', label: 'CRP' },
  ],
};

const getSubjectsByYear = (year) => {
  const allSubjects = SUBJECTS_BY_YEAR[Number(year)] || [];
  if (!currentUser || !currentUser.allowedSubjects) return allSubjects;
  const subjectsForYear = currentUser.allowedSubjectsByYear?.[Number(year)];
  const allowedSubjects = subjectsForYear || currentUser.allowedSubjects;
  if (allowedSubjects.includes("todas")) return allSubjects;
  return allSubjects.filter(subject => allowedSubjects.includes(subject.id));
};

const getAllowedYears = () => {
  if (!currentUser?.allowedYears) return [1, 2, 3, 4, 5];
  if (Array.isArray(currentUser.allowedYears)) return currentUser.allowedYears;
  return [1, 2, 3, 4, 5];
};

const canManageStudents = () => Boolean(currentUser?.puedeAgregarEstudiantes);
const isProfessorNestor = () => Boolean(currentUser?.name?.includes('Néstor') || currentUser?.name?.includes('Nestor'));
const canViewReports = () => isProfessorNestor() || currentUser?.name === 'Prof: Andy';
const canMarkAttendance = () => !isProfessorNestor();

const syncStudentManagementControls = () => {
  const mainBtn = document.getElementById('mainAddStudent');
  const landingBtn = document.getElementById('landingAddStudent');
  const btnAdminNestor = document.getElementById('btnModuloAdminNestor');
  const reportsBtn = document.getElementById('btnVerReportes');

  if (mainBtn) mainBtn.style.display = canManageStudents() ? 'inline-block' : 'none';
  if (landingBtn) landingBtn.style.display = canManageStudents() ? 'inline-block' : 'none';
  if (reportsBtn) reportsBtn.style.display = canViewReports() ? 'inline-block' : '';
  
  if (btnAdminNestor) {
    const esProfNestor = currentUser && (currentUser.name.includes("Néstor") || currentUser.name.includes("Nestor"));
    const esAdminExclusivo = currentUser && currentUser.soloAdmin;

    if (esProfNestor || esAdminExclusivo) {
      btnAdminNestor.classList.remove('hidden');
      btnAdminNestor.style.display = 'inline-block';
    } else {
      btnAdminNestor.classList.add('hidden');
      btnAdminNestor.style.display = 'none';
    }
  }
};

const isRegistrationPage = () => window.location.pathname.toLowerCase().endsWith('/registro.html') || window.location.pathname.toLowerCase().endsWith('registro.html');

const redirectToRegistrationPage = () => {
  if (!isRegistrationPage()) {
    window.location.href = 'registro.html';
  }
};

const redirectToLoginPage = () => {
  window.location.href = 'index.html';
};

const handleLogin = (e) => {
  e.preventDefault();

  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();

  if (TEACHERS[user] && TEACHERS[user].password === pass) {
    currentUser = TEACHERS[user];
    syncStudentManagementControls();

    sessionStorage.setItem('activeUser', JSON.stringify(currentUser));

    if (!isRegistrationPage()) {
      redirectToRegistrationPage();
      return;
    }

    if (currentUser.soloAdmin) {
      document.getElementById('landingView')?.classList.add('hidden');
      abrirAdminNestor();
      showToast(`Bienvenido Administrador/a`);
      return;
    }

    document.getElementById('loginForm').style.display = 'none';
    const introCenter = document.querySelector('.landing-intro center');
    if (introCenter) introCenter.style.display = 'none';

    const yearsSection = document.getElementById('years-section');
    if (yearsSection) yearsSection.style.display = 'block';

    const yearsContainer = document.getElementById('years-container');
    yearsContainer.innerHTML = '';
    let primerBotonAno = null;

    getAllowedYears().forEach((year) => {
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.textContent = `${year}° Año`;
      btn.style.margin = '5px';
     
      btn.addEventListener('click', () => {
        selectedYear = String(year);
        document.getElementById('landingView').classList.add('hidden');
        document.getElementById('mainView').classList.remove('hidden');
        renderStudentList();
        renderSelectionInfo();
      });
      if (!primerBotonAno) primerBotonAno = btn;
      yearsContainer.appendChild(btn);
    });

    if (window.location.hash === '#registro-asistencia') {
      primerBotonAno?.click();
      history.replaceState(null, '', window.location.pathname);
    }

    showToast(`Bienvenido/a, ${currentUser.name}`);
  } else {
    showToast('Usuario o contraseña incorrectos');
  }
};

const miFormulario = document.getElementById('loginForm');
if (miFormulario) {
  miFormulario.addEventListener('submit', handleLogin);
}

const yearSelect = document.getElementById('yearSelect');
const subjectSelect = document.getElementById('subjectSelect');
const dateInput = document.getElementById('dateInput');
const currentSelectionEl = document.getElementById('currentSelection');
const studentSummaryEl = document.getElementById('studentSummary');
const studentForm = document.getElementById('studentForm');
const studentNameInput = document.getElementById('studentName');
const studentCedulaInput = document.getElementById('studentCedula');
const studentEmailInput = document.getElementById('studentEmail');
const studentPhoneInput = document.getElementById('studentPhone');
const studentListContainer = document.getElementById('studentListContainer');
const lastEmailStatusEl = document.getElementById('lastEmailStatus');
const toastEl = document.getElementById('toast');
const exportWordBtn = document.getElementById('exportWord');
const subjectInfoEl = document.getElementById('subjectInfo');
const addStudentView = document.getElementById('addStudentView');
const addStudentSubjectInfo = document.getElementById('addStudentSubjectInfo');
const landingView = document.getElementById('landingView');
const mainView = document.getElementById('mainView');
const landingAddStudentBtn = document.getElementById('landingAddStudent');
const mainAddStudentBtn = document.getElementById('mainAddStudent');
const cerrarSesionBtn = document.getElementById('btnCerrarSesion');
const closeAddStudentBtn = document.getElementById('closeAddStudent');
const backToLandingBtn = document.getElementById('backToLanding');
const yearTabs = document.getElementById('yearTabs');
const subjectCards = document.getElementById('subjectCards');

let selectedYear = '1';
let selectedSubject = SUBJECTS_BY_YEAR[1][0].id;
let selectedDate = new Date().toISOString().slice(0, 10);
let attendanceData = {};
let editingStudentId = null;
let addStudentReturnView = 'landing';
let estudianteAbonoSeleccionado = null;

const showView = (view) => {
  const hasLanding = Boolean(landingView);
  const hasMainView = Boolean(mainView);

  if (landingView) {
    landingView.classList.toggle('hidden', view !== 'landing');
  } else if (hasMainView && view === 'landing') {
    mainView.classList.remove('hidden');
  }

  if (mainView) {
    const shouldShowMain = view === 'main' || view === 'addStudent' || (!hasLanding && view === 'landing');
    mainView.classList.toggle('hidden', !shouldShowMain);
  }

  if (addStudentView) addStudentView.classList.toggle('hidden', view !== 'addStudent');
  const adminView = document.getElementById('adminNestorView');
  if (adminView) adminView.classList.toggle('hidden', view !== 'adminNestor');
};

const getSubjectLabel = (year, subjectId) => {
  return getSubjectsByYear(year).find((subject) => subject.id === subjectId)?.label || 'Materia';
};

const updateAddStudentSubjectInfo = () => {
  const label = getSubjectLabel(selectedYear, selectedSubject);
  if (addStudentSubjectInfo) {
    addStudentSubjectInfo.textContent = `Curso: Año ${selectedYear} · Materia: ${label}`;
  }
};

const openAddStudentView = (returnTo) => {
  if (!canManageStudents()) {
    showToast('No tienes permiso para agregar estudiantes');
    return;
  }
  addStudentReturnView = returnTo;
  updateAddStudentSubjectInfo();
  showView('addStudent');
  studentForm.reset();
  editingStudentId = null;
  studentForm.querySelector('button[type="submit"]').textContent = 'Agregar alumno';
  studentNameInput.focus();
};

const openEditStudentView = (student) => {
  if (!canManageStudents()) {
    showToast('No tienes permiso para editar estudiantes');
    return;
  }
  addStudentReturnView = 'main';
  updateAddStudentSubjectInfo();
  showView('addStudent');
  editingStudentId = student.id;
  studentNameInput.value = student.name;
  studentCedulaInput.value = student.cedula || '';
  studentEmailInput.value = student.email || '';
  studentPhoneInput.value = student.phone;
  studentForm.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
  studentNameInput.focus();
};

const closeAddStudentView = () => {
  showView(addStudentReturnView);
};

const cerrarSesion = () => {
  currentUser = null;
  sessionStorage.removeItem('activeUser');

  if (!document.getElementById('landingView') || isRegistrationPage()) {
    redirectToLoginPage();
    return;
  }

  showView('landing');
  document.getElementById('loginForm')?.reset();
  const yearsSection = document.getElementById('years-section');
  if (yearsSection) yearsSection.style.display = 'none';
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.style.display = 'flex';
  syncStudentManagementControls();
};

const selectLandingYear = (year) => {
  selectedYear = year;
  const subjects = getSubjectsByYear(year);
  selectedSubject = subjects[0]?.id || selectedSubject;
  updateSubjectOptions(year);
  renderLanding();
};

const navigateToMain = (subjectId) => {
  selectedSubject = subjectId;
  selectedYear = selectedYear || '1';
  updateSubjectOptions(selectedYear);
  showView('main');
  renderStudentList();
  renderSelectionInfo();
};

const renderLanding = () => {
  const renderYearTabsInner = () => {
    if (!yearTabs) return;
    yearTabs.innerHTML = '';
    const yearsToShow = getAllowedYears();

    yearsToShow.forEach((year) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `year-tab ${String(selectedYear) === String(year) ? 'active' : ''}`;
      button.textContent = `Año ${year}`;
      button.addEventListener('click', () => selectLandingYear(year));
      yearTabs.appendChild(button);
    });
  };
  renderYearTabsInner();
  
  if (subjectCards) {
    const subjects = getSubjectsByYear(selectedYear);
    subjectCards.innerHTML = '';
    subjects.forEach((subject) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `subject-card ${selectedSubject === subject.id ? 'active' : ''}`;
      card.innerHTML = `<h3>${subject.label}</h3><span>Año ${selectedYear}</span>`;
      card.addEventListener('click', () => navigateToMain(subject.id));
      subjectCards.appendChild(card);
    });
  }
};

const handleLandingAddStudent = () => openAddStudentView('landing');

const renderSelectionInfo = () => {
  const subjectLabel = getSubjectLabel(selectedYear, selectedSubject);
  const studentCount = getCurrentStudents().length;
  if (currentSelectionEl) {
    currentSelectionEl.textContent = `Año ${selectedYear} · Materia: ${subjectLabel} · Fecha: ${selectedDate} · Estudiantes: ${studentCount}`;
  }
  if (studentSummaryEl) {
    studentSummaryEl.textContent = `${studentCount} estudiante${studentCount === 1 ? '' : 's'} en esta materia`;
  }
  if (subjectInfoEl) {
    subjectInfoEl.textContent = `Materia seleccionada: ${subjectLabel}`;
  }
};

const updateSubjectOptions = (year) => {
  const subjects = getSubjectsByYear(year);
  subjectSelect.innerHTML = '';
  subjects.forEach((subject) => {
    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = subject.label;
    subjectSelect.appendChild(option);
  });
  if (!subjects.some((subject) => subject.id === selectedSubject)) {
    selectedSubject = subjects[0]?.id || '';
  }
  subjectSelect.value = selectedSubject;
  renderLanding();
};

const getInitialData = () => {
  const data = { years: {}, selectedDate, lastDailyEmailSentDate: '', boletaVisibleState: 'NO' };
  for (let year = 1; year <= 5; year += 1) {
    data.years[year] = {
      students: [
        {
          id: `arianny-${year}`,
          name: 'Arianny Suarez',
          email: 'arianny@example.com',
          phone: DEFAULT_PHONE,
          status: '',
          paymentStatus: 'no_pago',
          paidAmount: 0,
          attendance: {},
          year,
        },
      ],
    };
  }
  return data;
};

const normalizeStudentYearData = (data) => {
  const normalized = data && typeof data === 'object' ? data : { years: {} };
  normalized.years = normalized.years || {};

  const legacyStudents = Array.isArray(normalized.students)
    ? normalized.students
    : Object.values(normalized.students || {});

  if (legacyStudents.length) {
    legacyStudents.forEach((student) => {
      if (!student || !student.id) return;
      const year = Number(student.year || student.ano || student.anio || 1);
      const studentsByYear = ensureYearStudents.call({ years: normalized.years }, year);
      const exists = studentsByYear.some((item) => String(item.id) === String(student.id));
      if (!exists) {
        studentsByYear.push({
          ...student,
          year,
          paymentStatus: student.paymentStatus || 'no_pago',
          paidAmount: student.paidAmount || 0,
          BoletaVisible: String(student.BoletaVisible || student.boleta_visible || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO',
          attendance: student.attendance || {},
          attendanceByDate: student.attendanceByDate || {
            [selectedDate]: Object.fromEntries(Object.entries(student.attendance || {}).map(([subject, entry]) => [subject, entry?.status || entry])),
          },
        });
      }
    });
    delete normalized.students;
  }

  Object.keys(normalized.years).forEach((year) => {
    normalized.years[year].students = (normalized.years[year].students || []).map((student) => ({
      ...student,
      paymentStatus: student.paymentStatus || 'no_pago',
      paidAmount: student.paidAmount || 0,
      BoletaVisible: String(student.BoletaVisible || student.boleta_visible || 'NO').toUpperCase() === 'SI' ? 'SI' : 'NO',
      attendance: student.attendance || {},
      attendanceByDate: student.attendanceByDate || {
        [selectedDate]: Object.fromEntries(Object.entries(student.attendance || {}).map(([subject, entry]) => [subject, entry?.status || entry])),
      },
      year: Number(student.year || year),
    }));
  });

  for (let year = 1; year <= 5; year += 1) {
    ensureYearStudents.call({ years: normalized.years }, year);
  }

  return normalized;
};

const cargarTodosLosEstudiantesDesdeSupabase = async () => {
  const emptyYears = {};
  for (let year = 1; year <= 5; year += 1) {
    emptyYears[year] = { students: [] };
  }

  attendanceData = normalizeStudentYearData({ years: emptyYears, selectedDate });
  attendanceData.selectedDate = selectedDate;

  try {
    const response = await fetch(API_STUDENTS, {
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      console.warn('No se pudo cargar todos los estudiantes desde Supabase; se muestra estado vacío en memoria.');
      return;
    }

    const data = await response.json().catch(() => []);
    if (!Array.isArray(data)) return;

    data.forEach((row) => {
      const year = Number(row.year || 1);
      attendanceData.years[year] = attendanceData.years[year] || { students: [] };
      attendanceData.years[year].students.push({
        id: row.id,
        name: row.name,
        cedula: row.cedula || '',
        email: row.email || '',
        phone: row.phone || '',
        status: row.status || '',
        paymentStatus: row.paymentStatus || row.payment_status || 'no_pago',
        paidAmount: row.paidAmount ?? row.paid_amount ?? 0,
        payments: row.payments || {},
        BoletaVisible: row.BoletaVisible || row.boleta_visible || 'NO',
        attendance: row.attendance || {},
        attendanceByDate: row.attendanceByDate || {
          [selectedDate]: Object.fromEntries(Object.entries(row.attendance || {}).map(([subject, entry]) => [subject, entry?.status || entry])),
        },
        year,
      });
    });
  } catch (error) {
    console.warn('No se pudo conectar con Supabase para cargar estudiantes:', error);
  }
};

const loadData = async () => {
  await cargarTodosLosEstudiantesDesdeSupabase();
};

const saveData = () => {
  attendanceData.selectedDate = selectedDate;
};

const sincronizarEstudiante = async (student, method = 'POST') => {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (method !== 'DELETE') options.body = JSON.stringify(student);
    const url = method === 'DELETE'
      ? `${API_STUDENTS}?id=${encodeURIComponent(student.id)}`
      : API_STUDENTS;
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Error ${response.status} al sincronizar estudiante`);
    }
    return method === 'DELETE' ? true : await response.json();
  } catch (error) {
    console.warn('No se pudo sincronizar el estudiante con el servidor:', error);
    showToast('No se pudo guardar el estudiante en la nube');
    return false;
  }
};

const sincronizarAsistencia = async (student, status) => {
  try {
    const response = await fetch(API_ATTENDANCE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: student.id,
        name: student.name,
        cedula: student.cedula,
        email: student.email,
        phone: student.phone,
        year: Number(selectedYear),
        subject: selectedSubject,
        subjectLabel: getSubjectLabel(selectedYear, selectedSubject),
        status,
        date: selectedDate,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Error ${response.status} al guardar asistencia`);
    }
    return await response.json();
  } catch (error) {
    console.warn('No se pudo sincronizar la asistencia con el servidor:', error);
    showToast('No se pudo guardar la asistencia en la nube');
    return { emailSent: false, emailError: error.message || 'no se pudo conectar con el servidor' };
  }
};

const showToast = (message) => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  toastEl.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toastEl.classList.remove('visible');
    toastEl.classList.add('hidden');
  }, 2800);
};

const showAttendanceModal = (message) => {
  const modal = document.getElementById('attendanceModal');
  const msg = document.getElementById('attendanceModalMessage');
  const closeBtn = document.getElementById('attendanceModalClose');
  if (!modal || !msg) return;
  msg.textContent = message;
  modal.classList.remove('hidden');
  if (closeBtn) {
    const handler = () => {
      modal.classList.add('hidden');
      closeBtn.removeEventListener('click', handler);
    };
    closeBtn.addEventListener('click', handler);
  }
  clearTimeout(showAttendanceModal.timeoutId);
  showAttendanceModal.timeoutId = setTimeout(() => {
    modal.classList.add('hidden');
  }, 2500);
};

const buildSelectors = () => {
  if (!yearSelect || !subjectSelect) return;
  yearSelect.innerHTML = '';
  subjectSelect.innerHTML = '';

  const yearsToShow = getAllowedYears();
  yearsToShow.forEach((year) => {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = `Año ${year}`;
    yearSelect.appendChild(option);
  });

  const stringYears = yearsToShow.map(String);
  if (!stringYears.includes(String(selectedYear))) {
    selectedYear = stringYears[0];
  }
 
  yearSelect.value = String(selectedYear);
  updateSubjectOptions(selectedYear);
};

const ensureYearStudents = (year) => {
  const normalizedYear = Number(year) || 1;
  attendanceData.years = attendanceData.years || {};
  if (!attendanceData.years[normalizedYear]) {
    attendanceData.years[normalizedYear] = { students: [] };
  }
  if (!Array.isArray(attendanceData.years[normalizedYear].students)) {
    attendanceData.years[normalizedYear].students = [];
  }
  return attendanceData.years[normalizedYear].students;
};

const findStudentByYear = (year, studentId) => {
  const yearStudents = ensureYearStudents(year);
  return yearStudents.find((student) => String(student.id) === String(studentId));
};

const getCurrentStudents = () => {
  return ensureYearStudents(selectedYear);
};

const renderStudentList = () => {
  let students = getCurrentStudents().filter((student) => !isRemovedStudent(student));
  (async () => {
    try {
      const r = await fetch(`${API_STUDENTS}?year=${encodeURIComponent(selectedYear)}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (r.ok && r.status !== 304) {
        const data = await r.json().catch(() => ([]));
        if (Array.isArray(data)) {
          attendanceData.years[selectedYear] = attendanceData.years[selectedYear] || {};
          attendanceData.years[selectedYear].students = data.map((row) => ({
            id: row.id,
            name: row.name,
            cedula: row.cedula || '',
            email: row.email || '',
            phone: row.phone || '',
            status: row.status || '',
            paymentStatus: row.paymentStatus || row.payment_status || 'no_pago',
            paidAmount: row.paidAmount ?? row.paid_amount ?? 0,
            payments: row.payments || {},
            BoletaVisible: row.BoletaVisible || row.boleta_visible || 'NO',
            attendance: row.attendance || {},
            attendanceByDate: row.attendanceByDate || {
              [selectedDate]: Object.fromEntries(Object.entries(row.attendance || {}).map(([subject, entry]) => [subject, entry?.status || entry])),
            },
            year: Number(selectedYear),
          })).filter((student) => !isRemovedStudent(student));
          students = attendanceData.years[selectedYear].students;
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar estudiantes desde Supabase:', e);
    }

    if (!students || !students.length) {
      if (studentListContainer) {
        studentListContainer.innerHTML = '<p style="color: #000000; font-weight: bold;">No hay estudiantes aún en este curso y materia.</p>';
      }
      renderSelectionInfo();
      return;
    }

    const table = document.createElement('div');
    table.className = 'table-wrapper';
    table.innerHTML = `
      <table style="color: #000000;">
        <thead>
          <tr style="color: #000000;">
            <th style="color: #000000; font-weight: bold;">Nombre</th>
            <th style="color: #000000; font-weight: bold;">Cédula</th>
            <th style="color: #000000; font-weight: bold;">Correo</th>
            <th style="color: #000000; font-weight: bold;">Representante</th>
            <th style="color: #000000; font-weight: bold;">${canMarkAttendance() ? 'Asistencia' : ''}</th>
          </tr>
        </thead>
        <tbody style="color: #000000;">
          ${students
            .map((student) => {
              const currentStatus = getAttendanceStatus(student, selectedSubject);
              const asistClass = currentStatus === 'asistente' ? 'active' : '';
              const inasistClass = currentStatus === 'inasistente' ? 'active' : '';
              const canEditStudents = canManageStudents();
              const attendanceButtons = canMarkAttendance() ? `
                <button class="state-button btn-asistente ${asistClass}" data-action="asistente" data-id="${student.id}" aria-pressed="${currentStatus === 'asistente'}" title="${currentStatus === 'asistente' ? 'Estado actual: asistente' : 'Marcar como asistente'}">${currentStatus === 'asistente' ? '<span class="state-check">✓</span>' : ''}<span>Asistente</span></button>
                <button class="state-button btn-inasistente ${inasistClass}" data-action="inasistente" data-id="${student.id}" aria-pressed="${currentStatus === 'inasistente'}" title="${currentStatus === 'inasistente' ? 'Estado actual: inasistente' : 'Marcar como inasistente'}">${currentStatus === 'inasistente' ? '<span class="state-check">✓</span>' : ''}<span>Inasistente</span></button>` : '';
              return `
                <tr data-id="${student.id}" style="color: #000000;">
                  <td style="color: #000000; font-weight: bold;">${student.name}</td>
                  <td style="color: #000000;">${student.cedula || 'No registrada'}</td>
                  <td style="color: #000000;">${student.email || '-'}</td>
                  <td style="color: #000000;">${student.phone}</td>
                  <td>
                    <div class="state-buttons">
                      ${attendanceButtons}
                      ${canEditStudents ? `<button class="secondary" style="color: #000000;" data-action="edit" data-id="${student.id}">Editar</button>` : ''}
                      ${canEditStudents ? `<button class="secondary" style="color: #000000;" data-action="delete" data-id="${student.id}">Borrar</button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    if (studentListContainer) {
      studentListContainer.innerHTML = '';
      studentListContainer.appendChild(table);
    }
    renderSelectionInfo();
  })();
};

const updateYearSelection = () => {
  const allowedYears = getAllowedYears().map(String);
  const intentoDeAno = String(yearSelect.value);

  if (!allowedYears.includes(intentoDeAno)) {
    showToast('⚠️ No tienes permisos para gestionar este año.');
    yearSelect.value = selectedYear;
    return;
  }

  selectedYear = intentoDeAno;
  updateSubjectOptions(selectedYear);
  renderStudentList();
};

const updateSubjectSelection = () => {
  selectedSubject = subjectSelect.value;
  renderStudentList();
};

const updateDateSelection = (event) => {
  selectedDate = event.target.value;
  saveData();
  renderStudentList();
  renderSelectionInfo();
};

const normalizeName = (name) => name.trim().replace(/\s+/g, ' ');
const normalizarTexto = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const findStudentById = (id) => {
  const students = getCurrentStudents();
  const match = students.find((student) => String(student.id) === String(id));
  if (match) return match;

  for (const yearKey of Object.keys(attendanceData.years || {})) {
    const found = (attendanceData.years[yearKey]?.students || []).find((student) => String(student.id) === String(id));
    if (found) return found;
  }
  return undefined;
};

const getAttendanceStatus = (student, subjectId) => {
  return student.attendanceByDate?.[selectedDate]?.[subjectId] || '';
};

const updateLastEmailStatus = () => {
  if (!lastEmailStatusEl) return;
  if (!attendanceData.lastDailyEmailSentDate) {
    lastEmailStatusEl.textContent = 'Último resumen diario: no enviado aún.';
    return;
  }
  lastEmailStatusEl.textContent = `Último resumen diario enviado: ${attendanceData.lastDailyEmailSentDate}`;
};

const setStudentStatus = async (id, status) => {
  const students = getCurrentStudents();
  const student = students.find((item) => String(item.id) === String(id));
  if (!student) return;
 
  student.attendance = student.attendance || {};
  student.attendance[selectedSubject] = status;
  student.status = status;
  student.attendanceByDate = student.attendanceByDate || {};
  student.attendanceByDate[selectedDate] = student.attendanceByDate[selectedDate] || {};
  student.attendanceByDate[selectedDate][selectedSubject] = status;
 
  saveData();
  const result = await sincronizarAsistencia(student, status);
  renderStudentList();
 
  if (status === 'asistente') {
    showAttendanceModal(result?.emailSent ? 'Se marcó asistente y se envió el correo' : `Se marcó asistente; ${result?.emailError || 'correo no enviado'}`);
  } else if (status === 'inasistente') {
    showAttendanceModal(result?.emailSent ? 'Se marcó inasistente y se envió el correo' : `Se marcó inasistente; ${result?.emailError || 'correo no enviado'}`);
  }
};

const deleteStudent = (id) => {
  if (!canManageStudents()) {
    showToast('No tienes permiso para borrar estudiantes');
    return;
  }
  attendanceData.years[selectedYear].students = getCurrentStudents().filter((student) => String(student.id) !== String(id));
  deletedStudentIds.add(String(id));
  saveData();
  sincronizarEstudiante({ id }, 'DELETE');
  renderStudentList();
  showToast('Estudiante eliminado correctamente');
};

const startEditStudent = (id) => {
  const student = findStudentById(id);
  if (student) openEditStudentView(student);
};

const saveEditedStudent = async () => {
  if (!canManageStudents()) return;
  const student = findStudentById(editingStudentId);
  if (!student) return;

  const name = normalizeName(studentNameInput.value);
  const cedula = studentCedulaInput.value.trim();
  const email = studentEmailInput.value.trim();
  const phone = studentPhoneInput.value.trim();
  if (!name || !email) {
    showToast('Completa nombre y correo para guardar');
    return;
  }
  const previousStudent = { ...student };
  student.name = name;
  student.cedula = cedula;
  student.email = email;
  student.phone = phone;
  saveData();
  const savedStudent = await sincronizarEstudiante(student, 'PATCH');
  if (!savedStudent) {
    Object.assign(student, previousStudent);
    saveData();
    return;
  }
  editingStudentId = null;
  studentForm.querySelector('button[type="submit"]').textContent = 'Agregar alumno';
  renderStudentList();
  studentForm.reset();
  showToast('Datos actualizados correctamente');
};

const handleStudentFormSubmit = async (event) => {
  event.preventDefault();

  if (!canManageStudents()) return;

  const name = normalizeName(studentNameInput.value);
  const cedula = studentCedulaInput.value.trim();
  const email = studentEmailInput.value.trim();
  const phone = studentPhoneInput.value.trim();

  if (!name || !email) {
    showToast('Debes ingresar nombre y correo');
    return;
  }

  if (editingStudentId) {
    await saveEditedStudent();
    return;
  }

  const resolvedYear = Number(selectedYear || document.getElementById('yearSelect')?.value || 1);
  const targetYearKey = String(resolvedYear);

  console.log('payload estudiante antes de guardar:', {
    name,
    email,
    year: resolvedYear,
    selectedYear,
    yearSelect: document.getElementById('yearSelect')?.value,
  });

  const newStudent = {
    id: window.crypto?.randomUUID?.() || `student-${Date.now()}`,
    name,
    cedula,
    email,
    phone,
    status: '',
    paymentStatus: 'no_pago',
    paidAmount: 0,
    attendance: {},
    BoletaVisible: 'NO',
    year: resolvedYear,
  };
  attendanceData.years[targetYearKey] = attendanceData.years[targetYearKey] || { students: [] };
  attendanceData.years[targetYearKey].students.push(newStudent);
  saveData();
  const savedStudent = await sincronizarEstudiante(newStudent);
  if (savedStudent?.id !== undefined) newStudent.id = savedStudent.id;
  studentForm.reset();
  renderStudentList();
  showToast('Estudiante agregado correctamente');
  if (addStudentView && !addStudentView.classList.contains('hidden')) {
    showView('main');
  }
};

const exportCurrentToPdf = () => {
  const students = getCurrentStudents();
  const subjectLabel = getSubjectLabel(selectedYear, selectedSubject);

  if (!students.length) {
    showToast('No hay estudiantes para exportar en PDF');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('No se pudo cargar la exportación PDF');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text(`Asistencia - Año ${selectedYear} - ${subjectLabel}`, 14, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Fecha: ${selectedDate}`, 14, y);
  y += 10;

  students.forEach((student) => {
    doc.text(`${student.name} - ${student.phone} - Status: ${student.status || 'pendiente'}`, 14, y);
    y += 7;
  });

  doc.save(`asistencia_ano${selectedYear}_${subjectLabel}_${selectedDate}.pdf`);
  showToast('PDF descargado correctamente');
};

const handleStudentListClick = (event) => {
  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) return;
 
  const action = actionButton.dataset.action;
  const studentId = actionButton.dataset.id;

  if (action === 'delete') {
    deleteStudent(studentId);
    return;
  }
  if (action === 'edit') {
    startEditStudent(studentId);
    return;
  }
 
  if (action === 'asistente' || action === 'inasistente') {
    if (!canMarkAttendance()) return;
    if (!selectedDate || selectedDate.trim() === '') {
      showToast('⚠️ Por favor, selecciona una fecha primero');
      return;
    }
    setStudentStatus(studentId, action);
  }
};

const abrirAdminNestor = async () => {
  const esProfNestor = currentUser && (currentUser.name.includes("Néstor") || currentUser.name.includes("Nestor"));
  const esAdminExclusivo = currentUser && currentUser.soloAdmin;

  if (!esProfNestor && !esAdminExclusivo) {
    showToast('⚠️ Acceso restringido al Módulo Administrativo.');
    return;
  }

  const btnCerrar = document.getElementById('btnCerrarAdmin');
  if (btnCerrar) {
    btnCerrar.textContent = currentUser.soloAdmin ? '🚪 Cerrar Sesión' : '← Volver al Sistema';
  }

  await cargarTodosLosEstudiantesDesdeSupabase();
  actualizarVistaAdminNestor();
  showView('adminNestor');
};

const cerrarAdminNestor = () => {
  if (currentUser && currentUser.soloAdmin) {
    sessionStorage.clear();
    currentUser = null;
    location.reload();
    return;
  }
  showView('main');
};

const cambiarEstadoBoletas = (habilitado) => {
  attendanceData.boletaVisibleState = habilitado ? 'SI' : 'NO';
  saveData();
  actualizarVistaAdminNestor();
  showToast(habilitado ? '✅ Boletines habilitados para consulta' : '🔒 Boletines bloqueados correctamente');
};

const autorizarBoletaEstudiante = async (studentId, year) => {
  const student = (attendanceData.years[year]?.students || []).find(s => String(s.id) === String(studentId));
  if (!student) return;

  const boletaAutorizada = String(student.BoletaVisible || '').toUpperCase().trim() === 'SI';
  student.BoletaVisible = boletaAutorizada ? 'NO' : 'SI';
  saveData();
  const savedStudent = await sincronizarEstudiante(student, 'PATCH');
  if (!savedStudent) {
    student.BoletaVisible = boletaAutorizada ? 'SI' : 'NO';
    saveData();
    actualizarVistaAdminNestor();
    return;
  }
  actualizarVistaAdminNestor();
  showToast(`Boleta de ${student.name} ${student.BoletaVisible === 'SI' ? 'autorizada (SI)' : 'bloqueada (NO)'}`);
};
window.autorizarBoletaEstudiante = autorizarBoletaEstudiante;

const cambiarEstadoPago = async (studentId, year, estado) => {
  const student = findStudentByYear(year, studentId) || findStudentById(studentId);
  if (!student) return;

  const monto = estado === 'pago' ? costoPeriodo() : 0;
  guardarPagoPeriodo(student, estado, monto);
  student.paymentStatus = estado;
  student.paidAmount = monto;

  saveData();
  await sincronizarEstudiante(student, 'PATCH');
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
  mostrarReciboPago(student, Number(student.year || year));
  showToast(`Estado de pago de ${student.name} actualizado: ${estado.toUpperCase()}`);
};

const abrirModalAbono = (studentId, year, name) => {
  estudianteAbonoSeleccionado = { studentId, year, name };
  document.getElementById('abonoStudentName').textContent = `Estudiante: ${name}`;
  document.getElementById('montoAbonoInput').value = '';
  document.getElementById('abonoModal').classList.remove('hidden');
};

const cerrarModalAbono = () => {
  estudianteAbonoSeleccionado = null;
  document.getElementById('abonoModal').classList.add('hidden');
};

const guardarAbono = async () => {
  if (!estudianteAbonoSeleccionado) return;
  const monto = parseFloat(document.getElementById('montoAbonoInput').value);

  if (isNaN(monto) || monto < 0) {
    showToast('⚠️ Ingresa un monto válido');
    return;
  }

  const { studentId, year, name } = estudianteAbonoSeleccionado;
  cerrarModalAbono();
  const student = findStudentByYear(year, studentId) || findStudentById(studentId);

  if (student) {
    guardarPagoPeriodo(student, 'abono', monto);
    student.paymentStatus = 'abono';
    student.paidAmount = normalizarMontoPago(monto);
    saveData();
    await sincronizarEstudiante(student, 'PATCH');
    actualizarVistaAdminNestor();
    renderizarGraficasAdmin();
    mostrarReciboPago(student, Number(student.year || year));
    showToast(`Abono de $${monto} registrado para ${name}`);
  }
};

const actualizarVistaAdminNestor = () => {
  const container = document.getElementById('adminStudentOverviewContainer');
  if (!container) return;

  let totalAlumnos = 0;
  let html = `<table style="width:100%; border-collapse:collapse; margin-top:10px; color: #000000;">
    <thead>
      <tr style="background:#f1f5f9; text-align:left; color: #000000;">
        <th style="padding:10px; color: #000000; font-weight:bold;">Año</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Cédula</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Nombre</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Período</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Fecha</th>
        <th style="padding:10px; color: #000000; font-weight:bold;">Estado Pago</th>
        <th style="padding:10px; color: #000000; font-weight:bold; text-align:center;">Acciones de Pago y Boleta</th>
      </tr>
    </thead>
    <tbody style="color: #000000;">`;

  for (let year = 1; year <= 5; year++) {
    const list = (attendanceData.years[year]?.students || []).filter((student) => !isRemovedStudent(student));
    list.forEach(st => {
      const pago = obtenerPagoPeriodo(st);
      if (!coincideConFiltrosPago(st, pago)) return;
      totalAlumnos++;
      let badgeStyle = "background:#fee2e2; color:#dc2626;";
      let estadoTexto = "No pago";

      if (pago.status === 'pago') {
        badgeStyle = "background:#dcfce7; color:#15803d;";
        estadoTexto = "Pago Completo";
      } else if (pago.status === 'abono') {
        badgeStyle = "background:#fef9c3; color:#a16207;";
        estadoTexto = `Abonó: $${pago.amount}`;
      }

      const boletaEstudianteAutorizada = String(st.BoletaVisible || '').toUpperCase().trim() === 'SI';
      const btnBoletaEstilo = boletaEstudianteAutorizada 
        ? "background-color: #16a34a; color: white;" 
        : "background-color: #0284c7; color: white;";
      const textoBotonBoleta = boletaEstudianteAutorizada ? 'desautorizar boleta' : 'autorizar boleta';

      html += `
        <tr style="border-bottom:1px solid #e2e8f0; color: #000000;">
          <td style="padding:8px; color: #000000;">${year}° Año</td>
          <td style="padding:8px; color: #000000;">${st.cedula || 'No registrada'}</td>
          <td style="padding:8px; font-weight:bold; color: #000000;">${st.name}</td>
          <td style="padding:8px; color: #000000;">${PERIODOS_PAGO.find(periodo => periodo.id === periodoPagoActual)?.label || periodoPagoActual}</td>
          <td style="padding:8px; color: #000000;">${pago.date || 'Sin fecha'}</td>
          <td style="padding:8px;">
            <span class="badge-pago" style="${badgeStyle}">${estadoTexto}</span>
          </td>
          <td style="padding:8px; text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
              <button class="btn-pago-verde" onclick="cambiarEstadoPago('${st.id}', ${year}, 'pago')">$ Pago</button>
              <button class="btn-pago-rojo" onclick="cambiarEstadoPago('${st.id}', ${year}, 'no_pago')">No pago</button>
              <button class="btn-pago-amarillo" onclick="abrirModalAbono('${st.id}', ${year}, '${st.name}')">$ Abono</button>
              <button style="${btnBoletaEstilo} border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;" aria-pressed="${boletaEstudianteAutorizada}" onclick="autorizarBoletaEstudiante('${st.id}', ${year})">${textoBotonBoleta}</button>
            </div>
          </td>
        </tr>`;
    });
  }

  html += `</tbody></table><p style="margin-top:12px; font-weight:bold; color:#000000;">Total Estudiantes en Sistema: ${totalAlumnos}</p>`;
  container.innerHTML = html;
};

let chartEstadoPagosAdmin = null;
let chartFinanzasAdmin = null;
const CUOTA_MENSUAL_ESTUDIANTE = 30;
const COSTO_INSCRIPCION = 300;
const PERIODOS_PAGO = [  { id: 'inscripcion', label: 'Inscripción' },  { id: 'enero', label: 'Enero' },  { id: 'febrero', label: 'Febrero' },  { id: 'marzo', label: 'Marzo' },  { id: 'abril', label: 'Abril' },  { id: 'mayo', label: 'Mayo' },  { id: 'junio', label: 'Junio' },  { id: 'julio', label: 'Julio' },  { id: 'agosto', label: 'Agosto' },  { id: 'septiembre', label: 'Septiembre' },  { id: 'octubre', label: 'Octubre' },  { id: 'noviembre', label: 'Noviembre' },  { id: 'diciembre', label: 'Diciembre' },];
let periodoPagoActual = new Date().toLocaleString('es', { month: 'long' }).toLowerCase();
let fechaPagoActual = new Date().toISOString().slice(0, 10);
let filtroFechaPago = null;

const obtenerTodosLosEstudiantes = () => Object.values(attendanceData.years || {})
  .flatMap((yearData, index) => (yearData.students || []).map(student => ({ ...student, calculatedYear: index + 1 })));

const normalizarMontoPago = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const obtenerPagoPeriodo = (student, periodo = periodoPagoActual) => {
  const pagoGuardado = student.payments?.[periodo];
  if (pagoGuardado) {
    return {
      status: pagoGuardado.status || 'no_pago',
      amount: normalizarMontoPago(pagoGuardado.amount),
      date: pagoGuardado.date || '',
    };
  }
  if (periodo === periodoPagoActual && student.paymentStatus) {
    return { status: student.paymentStatus, amount: normalizarMontoPago(student.paidAmount), date: '' };
  }
  return { status: 'no_pago', amount: 0, date: '' };
};

const coincideConFiltrosPago = (student, pago) => {
  const busqueda = (document.getElementById('busquedaPagoInput')?.value || '').toLowerCase().trim();
  const anoSeleccionado = document.getElementById('filtroAnoAdminSelect')?.value || '';
  return (!busqueda || student.name.toLowerCase().includes(busqueda))
    && (!anoSeleccionado || String(student.calculatedYear || student.year) === anoSeleccionado)
    && (!filtroFechaPago || pago.date === filtroFechaPago);
};

const costoPeriodo = (periodo = periodoPagoActual) => periodo === 'inscripcion' ? COSTO_INSCRIPCION : CUOTA_MENSUAL_ESTUDIANTE;

const guardarPagoPeriodo = (student, status, amount = 0) => {
  student.payments = student.payments || {};
  student.payments[periodoPagoActual] = {
    status,
    amount: status === 'pago' ? costoPeriodo() : normalizarMontoPago(amount),
    date: fechaPagoActual,
  };
};

const mostrarReciboPago = (student, year) => {
  const pagos = Object.entries(student.payments || {})
    .filter(([, pago]) => pago.status === 'pago' || pago.status === 'abono')
    .sort(([, first], [, second]) => String(first.date || '').localeCompare(String(second.date || '')));
  const cedulaKey = Object.keys(student).find(key => normalizarTexto(key).includes('cedula'));
  const nombrePeriodo = periodo => PERIODOS_PAGO.find(item => item.id === periodo)?.label || periodo;
  document.getElementById('reciboNombre').textContent = student.name;
  document.getElementById('reciboCedula').textContent = student[cedulaKey] || 'No registrada';
  document.getElementById('reciboAno').textContent = `${year}° Año`;
  const obtenerMontoPago = (periodo, pago) => parseFloat(pago.amount) || (pago.status === 'pago' ? costoPeriodo(periodo) : 0);
  document.getElementById('reciboPagosBody').innerHTML = pagos.length
    ? pagos.map(([periodo, pago]) => {
      const montoPagado = obtenerMontoPago(periodo, pago);
      return `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${nombrePeriodo(periodo)}${pago.status === 'abono' ? ' (Abono)' : ''}</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #000000;">${pago.date || 'Sin fecha'}</td><td class="admin-receipt-amount">$${montoPagado.toFixed(2)}</td></tr>`;
    }).join('')
    : '<tr><td colspan="3" style="padding: 15px; text-align: center;">No hay pagos registrados.</td></tr>';
  document.getElementById('reciboTotal').textContent = pagos.reduce((total, [periodo, pago]) => total + obtenerMontoPago(periodo, pago), 0).toFixed(2);
  document.getElementById('reciboPagoModal').classList.remove('hidden');
};

const cerrarReciboPago = () => document.getElementById('reciboPagoModal').classList.add('hidden');

const configurarPeriodosPago = () => {
  const select = document.getElementById('periodoPagoSelect');
  if (!select) return;
  select.innerHTML = PERIODOS_PAGO.map(periodo => `<option value="${periodo.id}">${periodo.label}</option>`).join('');
  if (!PERIODOS_PAGO.some(periodo => periodo.id === periodoPagoActual)) periodoPagoActual = 'inscripcion';
  select.value = periodoPagoActual;
  document.getElementById('fechaPagoInput').value = fechaPagoActual;
  actualizarEtiquetaPeriodoPago();
};

const actualizarEtiquetaPeriodoPago = () => {
  const etiqueta = document.getElementById('periodoPagoActualLabel');
  const periodo = PERIODOS_PAGO.find(item => item.id === periodoPagoActual);
  if (etiqueta && periodo) etiqueta.textContent = `(${periodo.label})`;
};

const actualizarFiltrosPago = () => {
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const cambiarPeriodoPago = (periodo) => {
  periodoPagoActual = periodo;
  filtroFechaPago = null;
  actualizarEtiquetaPeriodoPago();
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const cambiarFechaPago = (fecha) => {
  fechaPagoActual = fecha || new Date().toISOString().slice(0, 10);
  filtroFechaPago = fecha || null;
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const aplicarFiltroFechaPago = (filtro) => {
  const fecha = new Date();
  if (filtro === 'ayer') fecha.setDate(fecha.getDate() - 1);
  if (filtro === 'semana') fecha.setDate(fecha.getDate() - 7);
  filtroFechaPago = filtro === 'todo' ? null : fecha.toISOString().slice(0, 10);
  if (filtroFechaPago) {
    fechaPagoActual = filtroFechaPago;
    document.getElementById('fechaPagoInput').value = filtroFechaPago;
  }
  actualizarVistaAdminNestor();
  renderizarGraficasAdmin();
};

const alternarEstadisticasGlobales = () => {
  const panel = document.getElementById('estadisticasGlobalesAdmin');
  const button = document.getElementById('btnAbrirEstadisticasGlobales');
  if (!panel) return;
  const ocultar = panel.classList.toggle('hidden');
  button.textContent = ocultar ? 'Abrir Dashboard de Estadísticas Globales ➔' : 'Ocultar Estadísticas Globales';
  if (!ocultar) renderizarGraficasAdmin();
};

const renderizarGraficasAdmin = () => {
  let totalPagados = 0;
  let totalAbonados = 0;
  let totalNoPagados = 0;

  let montoRecolectado = 0;
  let montoAdeudado = 0;

  for (let year = 1; year <= 5; year++) {
    const list = attendanceData.years[year]?.students || [];
    list.forEach(st => {
      const pago = obtenerPagoPeriodo(st);
      if (!coincideConFiltrosPago(st, pago)) return;
      const estado = pago.status || 'no_pago';
      const cuota = costoPeriodo();

      if (estado === 'pago') {
        totalPagados++;
        montoRecolectado += parseFloat(pago.amount) || cuota;
      } else if (estado === 'abono') {
        totalAbonados++;
        const abono = parseFloat(pago.amount) || 0;
        montoRecolectado += abono;
        montoAdeudado += Math.max(0, cuota - abono);
      } else {
        totalNoPagados++;
        montoAdeudado += cuota;
      }
    });
  }

  const ctxPagos = document.getElementById('graficaEstadoPagosAdmin');
  if (ctxPagos) {
    if (chartEstadoPagosAdmin) chartEstadoPagosAdmin.destroy();
    chartEstadoPagosAdmin = new Chart(ctxPagos.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Pagaron Completo', 'Han Abonado', 'No Han Pagado'],
        datasets: [{
          data: [totalPagados, totalAbonados, totalNoPagados],
          backgroundColor: ['#16a34a', '#eab308', '#dc2626'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  const ctxFinanzas = document.getElementById('graficaFinancieraMensualAdmin');
  if (ctxFinanzas) {
    if (chartFinanzasAdmin) chartFinanzasAdmin.destroy();
    chartFinanzasAdmin = new Chart(ctxFinanzas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Recolectado ($)', 'Adeudado ($)'],
        datasets: [{
          label: 'Monto ($)',
          data: [montoRecolectado, montoAdeudado],
          backgroundColor: ['#0284c7', '#f97316'],
          borderColor: ['#0369a1', '#c2410c'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
};

let miGrafica = null;

const abrirReportes = () => {
  window.location.href = 'reportes.html';
};

const cerrarReportes = () => {
  document.getElementById('seccionReportes').style.display = 'none';
  document.getElementById('contenedorPrincipal').style.display = 'block';
};

const generarGraficaYTabla = () => {
  const estudianteId = document.getElementById('selectorEstudianteReporte').value;
  const fechaInicio = document.getElementById('fechaInicioReporte').value;
  const fechaFin = document.getElementById('fechaFinReporte').value;

  if (!estudianteId) return;

  const estudiante = getCurrentStudents().find(e => String(e.id) === String(estudianteId));
  if (!estudiante) return;

  let totalAsistencias = 0;
  let totalInasistencias = 0;

  if (estudiante.historialAsistencia) {
    Object.entries(estudiante.historialAsistencia).forEach(([fechaGuardada, estado]) => {
      let entraEnRango = true;
      if (fechaInicio && fechaGuardada < fechaInicio) entraEnRango = false;
      if (fechaFin && fechaGuardada > fechaFin) entraEnRango = false;

      if (entraEnRango) {
        if (estado === 'asistente') totalAsistencias++;
        if (estado === 'inasistente') totalInasistencias++;
      }
    });
  }

  const tbody = document.getElementById('tablaReporteBody');
  if (tbody) {
    tbody.innerHTML = `
      <tr style="color: #000000;">
        <td style="color: #000000; font-weight: bold; padding: 8px;">${estudiante.nombre || estudiante.name}</td>
        <td style="color: green; font-weight: bold; padding: 8px;">${totalAsistencias}</td>
        <td style="color: red; font-weight: bold; padding: 8px;">${totalInasistencias}</td>
      </tr>
    `;
  }

  const ctx = document.getElementById('graficaAsistencia')?.getContext('2d');
  if (ctx) {
    if (typeof miGrafica !== 'undefined' && miGrafica) {
      miGrafica.destroy();
    }

    miGrafica = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Asistencias', 'Inasistencias'],
        datasets: [{
          label: 'Días en el rango seleccionado',
          data: [totalAsistencias, totalInasistencias],
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }
};

const init = () => {
  loadData();
  
  const savedUser = sessionStorage.getItem('activeUser');
  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);
      const currentTeacher = Object.values(TEACHERS).find(teacher => teacher.name === parsedUser.name);
      currentUser = currentTeacher || parsedUser;
      if (currentTeacher) sessionStorage.setItem('activeUser', JSON.stringify(currentTeacher));
    } catch (error) {
      sessionStorage.removeItem('activeUser');
    }
  }

  buildSelectors();

  if (yearSelect) yearSelect.value = selectedYear;
  updateSubjectOptions(selectedYear);
  if (dateInput) dateInput.value = selectedDate;
  
  renderLanding();

  if (currentUser) {
    if (currentUser.soloAdmin) {
      abrirAdminNestor();
    } else if (window.location.hash === '#registro-asistencia' || !document.getElementById('landingView')) {
      document.getElementById('landingView')?.classList.add('hidden');
      document.getElementById('mainView')?.classList.remove('hidden');
      showView('main');
      renderStudentList();
      history.replaceState(null, '', window.location.pathname);
    } else {
      showView('landing');
    }
  } else {
    if (document.getElementById('landingView')) {
      document.getElementById('landingView')?.classList.remove('hidden');
    }
    showView(document.getElementById('landingView') ? 'landing' : 'main');
  }

  syncStudentManagementControls();
  renderSelectionInfo();
  updateLastEmailStatus();
  configurarPeriodosPago();

  if (yearSelect) yearSelect.addEventListener('change', updateYearSelection);
  if (subjectSelect) subjectSelect.addEventListener('change', updateSubjectSelection);
  if (dateInput) dateInput.addEventListener('change', updateDateSelection);
  if (studentForm) studentForm.addEventListener('submit', handleStudentFormSubmit);
  if (studentListContainer) studentListContainer.addEventListener('click', handleStudentListClick);
  if (exportWordBtn) exportWordBtn.addEventListener('click', exportCurrentToPdf);
  if (landingAddStudentBtn) landingAddStudentBtn.addEventListener('click', handleLandingAddStudent);
  if (mainAddStudentBtn) mainAddStudentBtn.addEventListener('click', () => openAddStudentView('main'));
  if (cerrarSesionBtn) cerrarSesionBtn.addEventListener('click', cerrarSesion);
  if (closeAddStudentBtn) closeAddStudentBtn.addEventListener('click', closeAddStudentView);
  if (backToLandingBtn) {
    backToLandingBtn.addEventListener('click', () => {
      if (!document.getElementById('landingView') || isRegistrationPage()) {
        redirectToLoginPage();
        return;
      }
      showView('landing');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  init();
});

