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

Cada estudiante conserva su año, notas y materias pendientes en `students.year`, `students.grades` y `students.pending_subjects` (JSONB en Supabase; objetos en el respaldo local). Las claves de materia coinciden con los IDs del pensum:

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
  ]
}
```

El panel de materias pendientes aparece en el módulo de notas con los perfiles de Andy Suárez y Néstor Pérez. Permite elegir un estudiante, materias de su año y cuatro notas de revisión enteras entre 1 y 20; los cambios se guardan en `pendingSubjects` y aparecen en la boleta.

El portal resuelve el registro por cédula desde la API; los enlaces directos consultan `GET /api/students?id=<id>`. Usa `year` para seleccionar las materias de `REPORT_SUBJECT_IDS_BY_YEAR`, y relaciona cada ID con `grades[subjectId]`. La definitiva es el promedio de los tres lapsos (primero redondeando cada lapso, como en el módulo de notas), redondeado al entero más cercano; se muestra vacía (`-`) mientras falte algún lapso. La definitiva de CRP se expresa en el módulo de notas y en la boleta como A (19-20), B (16-18), C (12-15), D (10-11) o E (1-9). Los promedios por período usan solo las calificaciones numéricas disponibles de las materias del plan. Los porcentajes de inasistencia se calculan por materia y en el promedio general como inasistencias entre clases registradas (asistencias más inasistencias), usando las fechas de cada lapso del año escolar 2026-2027: septiembre-diciembre, enero-marzo y abril-julio. Los datos se consultan desde `attendances` en Supabase al cargar un estudiante; los días sin estado registrado no cuentan. La respuesta sigue siendo una lista de estudiantes y conserva el esquema `year`/`grades`; `grades` puede estar vacío cuando aún no hay notas.

Antes de habilitar la edición de revisiones en Supabase, ejecuta `supabase-pending-subjects.sql` en el editor SQL para crear `students.pending_subjects`.

El recibo de pago se descarga como PDF con el diseño mostrado en pantalla, incluyendo sello, datos del estudiante, detalle de pagos y total.

## Ejecución local

Instala las dependencias con `npm install` y ejecuta `npm start`. Para el envío de correo y la conexión a Supabase, configura las variables del servidor descritas en `.env.example`.
