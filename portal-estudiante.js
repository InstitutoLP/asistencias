// CONFIGURACIÓN DE ENLACES
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSDsgr1HsQGzCill3gzGk3mdFuWQad7AvbmHE1qKkUGMXR4sH9gVegK97UFCTscSg/pub?output=csv`;
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;
const API_SYNC_STATE = `${API_BASE_URL}/api/sync-state`; // Endpoint hacia la base de datos

let datosEstudianteActual = null;
let chartsInstancias = {};
let boletaAutorizadaActual = false;

const materiasOficiales = [ "Castellano", "Ingles", "Matematica", "Educacion Fisica", "Arte y Patrimonio", "Ciencias Naturales", "GHC", "Orientacion y Convivencia" ];
const codigosMaterias = { "Castellano": "CA", "Ingles": "LE", "Matematica": "MA", "Educacion Fisica": "EF", "Arte y Patrimonio": "AyP", "Ciencias Naturales": "CN", "GHC": "GHC", "Orientacion y Convivencia": "OyC", "CRP": "FRA" };
const nombresLargoMaterias = { "Castellano": "CASTELLANO", "Ingles": "INGLÉS Y OTRAS LENGUAS EXTRANJERAS", "Matematica": "MATEMÁTICAS", "Educacion Fisica": "EDUCACIÓN FÍSICA", "Arte y Patrimonio": "ARTE Y PATRIMONIO", "Ciencias Naturales": "CIENCIAS NATURALES", "GHC": "GEOGRAFÍA, HISTORIA Y CIUDADANÍA", "Orientacion y Convivencia": "ORIENTACIÓN Y CONVIVENCIA" };

const normalizarTexto = (texto) => texto ? String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
const normalizarCedula = (cedula) => String(cedula || '').trim().toUpperCase().replace(/\D/g, '') || String(cedula || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const coincideConEstudiante = (registro, estudiante) => {
  const cedulaKey = obtenerClaveEstudiante(estudiante, 'cedula');
  const nombreKey = obtenerClaveEstudiante(estudiante, 'nombre');
  const cedulaEstudiante = normalizarCedula(estudiante[cedulaKey]);
  const nombreEstudiante = normalizarTexto(estudiante[nombreKey] || estudiante.Nombre);
  const cedulaRegistro = normalizarCedula(registro.cedula || registro.Cedula || registro.identificacion);
  const nombreRegistro = normalizarTexto(registro.name || registro.nombre || registro.Nombre);

  if (cedulaEstudiante && cedulaRegistro) {
    return cedulaEstudiante === cedulaRegistro && (!nombreRegistro || nombreRegistro === nombreEstudiante);
  }
  return Boolean(nombreEstudiante && nombreRegistro && nombreEstudiante === nombreRegistro);
};

const obtenerClaveEstudiante = (estudiante, tipo) => Object.keys(estudiante || {}).find(key => {
  const clave = normalizarTexto(key);
  if (tipo === 'cedula') return clave.includes('cedula');
  if (tipo === 'ano') return clave.includes('ano') || clave.includes('grado');
  return clave.includes('nombre') || clave.includes('estudiante');
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
const extraerValorColumna = (datos, materia, lapso) => {
  const claveBuscada = normalizarTexto(`${materia}_${lapso}`).replace(/\s+/g, '');
  const clave = Object.keys(datos || {}).find((nombre) => {
    const nombreNormalizado = normalizarTexto(nombre).replace(/\s+/g, '');
    return nombreNormalizado === claveBuscada;
  });
  return clave ? datos[clave] || '-' : '-';
};

const actualizarTexto = (id, valor) => {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor || '-';
};

const renderizarBoletaEstudiante = (estudiante) => {
  const materias = [
    ['Castellano', 'CA'],
    ['Inglés', 'LE'],
    ['Matemáticas', 'MA'],
    ['Educación Fisíca', 'EF'],
    ['Arte y Patrimonio', 'AyP'],
    ['Ciencias Naturales', 'CN'],
    ['Geografía, historia y ciudadania', 'GHC'],
    ['Orientación y convivencia', 'OyC'],
  ];

  const cuerpo = document.getElementById('tablaNotasBody');
  if (cuerpo) {
    cuerpo.innerHTML = materias.map(([materia, codigo]) => `
      <tr>
        <td class="col-area">${materia.toUpperCase()}</td>
        <td>${codigo}</td>
        <td>${extraerValorColumna(estudiante, materia, '1er')}</td>
        <td>${extraerValorColumna(estudiante, materia, '2do')}</td>
        <td>${extraerValorColumna(estudiante, materia, '3er')}</td>
        <td>${extraerValorColumna(estudiante, materia, 'Final')}</td>
        <td>-</td><td>-</td><td>-</td><td>-</td>
        <td>-</td><td>-</td><td>-</td>
      </tr>
    `).join('');
  }

  actualizarTexto('prom1er', extraerValorColumna(estudiante, 'Promedio del estudiante', '1er'));
  actualizarTexto('prom2do', extraerValorColumna(estudiante, 'Promedio del estudiante', '2do'));
  actualizarTexto('prom3er', extraerValorColumna(estudiante, 'Promedio del estudiante', '3er'));
  actualizarTexto('promFinal', extraerValorColumna(estudiante, 'Promedio del estudiante', 'Final'));

  const ano = estudiante[obtenerClaveEstudiante(estudiante, 'ano')];
  const seccionKey = Object.keys(estudiante).find((key) => normalizarTexto(key).includes('seccion'));
  actualizarTexto('anoEscolarDisplay', 'AÑO ESCOLAR 2026-2027');
  actualizarTexto('anoDisplay', ano || '-');
  actualizarTexto('seccionDisplay', 'U');

  actualizarTexto('crp1er', extraerValorColumna(estudiante, 'Francés', '1er'));
  actualizarTexto('crp2do', extraerValorColumna(estudiante, 'Francés', '2do'));
  actualizarTexto('crp3er', extraerValorColumna(estudiante, 'Francés', '3er'));
  actualizarTexto('crpFinal', extraerValorColumna(estudiante, 'Francés', 'Final'));
  renderizarGraficos(materias.slice(0, 7), estudiante, estudiante, estudiante);
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
  if (!datosEstudianteActual || !window.jspdf?.jsPDF || !window.html2canvas) return;

  const boton = document.getElementById('btnDescargarBoleta');
  const textoOriginal = boton?.textContent;
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Generando PDF...';
  }

  try {
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
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = textoOriginal;
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

const verificarAutorizacionBoleta = async (estudiante) => {
  const backendData = await obtenerEstadoGlobalBackend();
  
  if (backendData && backendData.years) {
    let estadoEstudianteBackend = null;
    for (let year in backendData.years) {
      const estudiantesAno = backendData.years[year].students || [];
      const estudianteEncontrado = estudiantesAno.find(st => coincideConEstudiante(st, estudiante));
      
      if (estudianteEncontrado) {
        if (estudianteEncontrado.BoletaVisible !== undefined) estadoEstudianteBackend = estudianteEncontrado.BoletaVisible;
        else if (estudianteEncontrado.boleta_visible !== undefined) estadoEstudianteBackend = estudianteEncontrado.boleta_visible;
        else if (estudianteEncontrado.boletaVisible !== undefined) estadoEstudianteBackend = estudianteEncontrado.boletaVisible;
        else if (estudianteEncontrado.boletaAutorizada !== undefined) estadoEstudianteBackend = estudianteEncontrado.boletaAutorizada ? 'SI' : 'NO';
        break;
      }
    }

    if (estadoEstudianteBackend !== null && estadoEstudianteBackend !== '') {
      const valNorm = String(estadoEstudianteBackend).toUpperCase().trim();
      if (valNorm === 'SI' || valNorm === 'TRUE') return true;
      if (valNorm === 'NO' || valNorm === 'FALSE' || valNorm === 'DESAUTORIZADO') return false;
    }
  }

  return false;
};

document.getElementById('loginEstudianteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cedulaIngresada = document.getElementById('estudianteCedula').value;
  const botonSubmit = e.target.querySelector('button');
  const msjError = document.getElementById('errorMensaje');
  
  botonSubmit.textContent = "Buscando datos...";
  msjError.style.display = 'none';

  const todasLasNotas = await obtenerNotasDeSheets();
  
  if (todasLasNotas) {
    const alumnoEncontrado = todasLasNotas.find(n => {
      const cedulaKey = obtenerClaveEstudiante(n, 'cedula');
      return cedulaKey && normalizarCedula(n[cedulaKey]) === normalizarCedula(cedulaIngresada);
    });
    
    if (alumnoEncontrado) {
      const nombreKey = obtenerClaveEstudiante(alumnoEncontrado, 'nombre');
      alumnoEncontrado.Nombre = alumnoEncontrado[nombreKey];
      datosEstudianteActual = alumnoEncontrado;

      // Esperar la respuesta del backend
      boletaAutorizadaActual = await verificarAutorizacionBoleta(datosEstudianteActual);
      mostrarDashboard();
      await renderizarReciboEstudiante(); // Ahora asíncrono
      mostrarDocumento(boletaAutorizadaActual ? 'boleta' : 'recibo');
    } else {
      msjError.textContent = "❌ Cédula no encontrada. Verifica los datos ingresados.";
      msjError.style.display = 'block';
    }
  } else {
    msjError.textContent = "❌ Error conectando con la base de datos.";
    msjError.style.display = 'block';
  }
  botonSubmit.textContent = "Entrar";
});

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
  document.getElementById('landingView').classList.add('hidden');
  document.getElementById('mainView').classList.remove('hidden');
  document.getElementById('mainView').style.display = '';
};

const mostrarDocumento = (documento) => {
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
  
  const backendData = await obtenerEstadoGlobalBackend();
  
  if (backendData && backendData.years) {
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

  const pagosRegistrados = estudianteBackend?.payments && typeof estudianteBackend.payments === 'object'
    ? estudianteBackend.payments
    : {};
  const estadoPago = estudianteBackend?.paymentStatus || estudianteBackend?.payment_status;
  const montoPago = estudianteBackend?.paidAmount ?? estudianteBackend?.paid_amount;
  const pagos = Object.keys(pagosRegistrados).length
    ? Object.entries(pagosRegistrados)
    : (estadoPago === 'pago' || estadoPago === 'abono')
      ? [['actual', { status: estadoPago, amount: montoPago, date: '' }]]
      : [];
  const pagosFiltrados = pagos
    .filter(([, pago]) => pago.status === 'pago' || pago.status === 'abono')
    .sort(([, first], [, second]) => String(first.date || '').localeCompare(String(second.date || '')));
  
  const periodos = { inscripcion: 'Inscripción', enero: 'Enero', febrero: 'Febrero', marzo: 'Marzo', abril: 'Abril', mayo: 'Mayo', junio: 'Junio', julio: 'Julio', agosto: 'Agosto', septiembre: 'Septiembre', octubre: 'Octubre', noviembre: 'Noviembre', diciembre: 'Diciembre' };
  const cedulaKey = obtenerClaveEstudiante(datosEstudianteActual, 'cedula');
  const costoPeriodo = periodo => periodo === 'inscripcion' ? 300 : 30;
  const obtenerMontoPago = (periodo, pago) => parseFloat(pago.amount) || (pago.status === 'pago' ? costoPeriodo(periodo) : 0);
  
  document.getElementById('reciboEstudianteNombre').textContent = datosEstudianteActual.Nombre;
  document.getElementById('reciboEstudianteCedula').textContent = datosEstudianteActual[cedulaKey] || estudianteBackend?.cedula || 'No registrada';
  document.getElementById('reciboEstudianteAno').textContent = datosEstudianteActual[obtenerClaveEstudiante(datosEstudianteActual, 'ano')] || `${anoEstudiante}° Año`;
  document.getElementById('reciboEstudiantePagosBody').innerHTML = pagosFiltrados.length
    ? pagosFiltrados.map(([periodo, pago]) => `<tr><td>${periodos[periodo] || 'Período actual'}${pago.status === 'abono' ? ' (Abono)' : ''}</td><td>${pago.date || 'Sin fecha'}</td><td class="recibo-amount">$${obtenerMontoPago(periodo, pago).toFixed(2)}</td></tr>`).join('')
    : '<tr><td colspan="3" style="text-align: center;">No hay pagos registrados.</td></tr>';
  document.getElementById('reciboEstudianteTotal').textContent = pagosFiltrados.reduce((total, [periodo, pago]) => total + obtenerMontoPago(periodo, pago), 0).toFixed(2);
};

window.cerrarSesion = () => {
  datosEstudianteActual = null;
  boletaAutorizadaActual = false;
  const mainView = document.getElementById('mainView');
  const landingView = document.getElementById('landingView');
  const loginForm = document.getElementById('loginEstudianteForm');
  const cedulaInput = document.getElementById('estudianteCedula');
  const errorMensaje = document.getElementById('errorMensaje');

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