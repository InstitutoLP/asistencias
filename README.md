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

Cada estudiante conserva su año y notas en `students.year` y `students.grades` (JSONB en Supabase; objeto en el respaldo local). Las claves de materia coinciden con los IDs del pensum:

```json
{
  "id": "estudiante-123",
  "year": 1,
  "grades": {
    "castellano": { "1er": 16, "2do": 17, "3er": 18 },
    "matematicas": { "1er": 14, "2do": null, "3er": null }
  }
}
```

El portal resuelve el registro por cédula desde la API; los enlaces directos consultan `GET /api/students?id=<id>`. Usa `year` para seleccionar las materias de `REPORT_SUBJECT_IDS_BY_YEAR`, y relaciona cada ID con `grades[subjectId]`. La definitiva es el promedio de los tres lapsos (primero redondeando cada lapso, como en el módulo de notas), redondeado al entero más cercano; se muestra vacía (`-`) mientras falte algún lapso. Los promedios por período usan solo las calificaciones numéricas disponibles de las materias del plan. La respuesta sigue siendo una lista de estudiantes y conserva el mismo esquema `year`/`grades`; `grades` puede estar vacío cuando aún no hay notas.

## Ejecución local

Instala las dependencias con `npm install` y ejecuta `npm start`. Para el envío de correo y la conexión a Supabase, configura las variables del servidor descritas en `.env.example`.
