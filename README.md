# Sistema de asistencia escolar

## Estructura del proyecto

```text
css/
  styles.css
js/
  config/
    app-config.js
    external-libraries.js
    grade-subjects.js
  modelos/
    EstudiantesModelo.js
  vistas/
    PortalEstudianteVista.js
  controladores/
    AsistenciaControl.js
    NotasControl.js
index.html
registro.html
notas.html
portal-estudiantes.html
reportes.html
server.js
api/
```

- `config/` centraliza las direcciones de la API y la carga bajo demanda de librerías.
- `modelos/` contiene las solicitudes de datos de estudiantes y asistencia.
- `controladores/` coordina las acciones de asistencia y carga de notas.
- `vistas/` contiene la interfaz y lógica del portal del estudiante.
- `server.js` y `api/` permanecen en sus rutas porque las usa Express y el despliegue en Vercel.

Chart.js se carga al abrir un panel que necesita gráficas. Las librerías de PDF solo se descargan cuando se solicita una exportación. No se incluye el cliente de Supabase en el navegador: las páginas consultan los endpoints del servidor.

El pensum por año está centralizado en `js/config/grade-subjects.js` y lo comparten la carga de notas y la boleta. El portal obtiene el año y las notas guardadas del estudiante desde la API, muestra las materias del plan correspondiente y calcula la definitiva y los promedios a partir de los lapsos disponibles. La hoja de calificaciones se conserva como compatibilidad para estudiantes sin notas guardadas en el módulo.

### Modelo de calificaciones y boleta

Cada estudiante conserva su año y notas en `students.year` y `students.grades`. Las evaluaciones de Reparación y Materia Pendiente se guardan por separado en `students.pending_subjects` y `students.matter_pending_subjects` (JSONB en Supabase; objetos en el respaldo local). Las claves de materia coinciden con los IDs del pensum:

```json
{
  "id": "estudiante-123",
  "year": 1,
  "grades": {
    "castellano": { "1er": 16, "2do": 17, "3er": 18 },
    "matematicas": { "1er": 14, "2do": null, "3er": null }
  },
  "pendingSubjects": [
    { "subjectId": "castellano", "subjectLabel": "Castellano", "revisions": [12, 15, null, null] }
  ],
  "matterPendingSubjects": [
    { "subjectId": "matematicas", "subjectLabel": "Matemáticas", "revisions": [14, 16, null, null] }
  ]
}
```

Los recuadros independientes de Reparación y Materia Pendiente aparecen en el módulo de notas con los perfiles de Andy Suárez y Néstor Pérez. Cada uno permite elegir un estudiante, materias de su año y registrar cuatro notas enteras entre 1 y 20; sus datos se guardan por separado en `pendingSubjects` y `matterPendingSubjects`.

El portal resuelve el registro por cédula desde la API; los enlaces directos consultan `GET /api/students?id=<id>`. Usa `year` para seleccionar las materias de `REPORT_SUBJECT_IDS_BY_YEAR`, y relaciona cada ID con `grades[subjectId]`. La definitiva es el promedio de los tres lapsos (primero redondeando cada lapso, como en el módulo de notas), redondeado al entero más cercano; se muestra vacía (`-`) mientras falte algún lapso. La definitiva de CRP se expresa en el módulo de notas y en la boleta como A (19-20), B (16-18), C (12-15), D (10-11) o E (1-9). Los promedios por período usan solo las calificaciones numéricas disponibles de las materias del plan. El módulo de reportes y la boleta comparten el cálculo de asistencia en `js/config/attendance-calculations.js`. Para el año escolar 2026-2027, los lapsos son 5 de octubre-31 de diciembre, 15 de enero-31 de marzo y 1 de abril-31 de julio. Los porcentajes se calculan como inasistencias entre clases registradas (asistencias más inasistencias), por materia y para el promedio general; solo cuentan clases marcadas. La boleta consulta el historial actualizado de `attendances` en Supabase al cargar y reportes evita la caché del navegador. La respuesta sigue siendo una lista de estudiantes y conserva el esquema `year`/`grades`; `grades` puede estar vacío cuando aún no hay notas.

El chat flotante del portal está temporalmente en modo de demostración local: muestra respuestas simuladas y no envía mensajes a BuilderBot ni requiere teléfono. Para conectar respuestas reales se necesita configurar un canal de recepción compatible (por ejemplo, un webhook o una API de lectura de conversaciones). El endpoint `/api/builderbot-messages` conserva el envío a BuilderBot desde el servidor; sus credenciales `BUILDERBOT_BOT_ID` y `BUILDERBOT_API_KEY` deben permanecer en variables de entorno, nunca en JavaScript ni HTML.

Antes de habilitar la edición de revisiones en Supabase, ejecuta `supabase-pending-subjects.sql` en el editor SQL para crear `students.pending_subjects`.

Para habilitar el recuadro independiente de Materia Pendiente en Supabase, ejecuta `supabase-matter-pending-subjects.sql` para crear `students.matter_pending_subjects`.

El recibo de pago se descarga como PDF con el diseño mostrado en pantalla, incluyendo sello, datos del estudiante, detalle de pagos y total.

## Ejecución local

Instala las dependencias con `npm install` y ejecuta `npm start`. Para el envío de correo y la conexión a Supabase, configura las variables del servidor descritas en `.env.example`.
