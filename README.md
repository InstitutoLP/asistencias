# Sistema de asistencia escolar

## Estructura del proyecto

```text
css/
  styles.css
js/
  config/
    app-config.js
    external-libraries.js
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

La pestaña de notas inicia en paralelo la carga de estudiantes y la hoja de calificaciones, reutiliza la hoja durante la sesión y crea un índice en memoria para relacionar estudiantes con registros de esa hoja.

## Ejecución local

Instala las dependencias con `npm install` y ejecuta `npm start`. Para el envío de correo y la conexión a Supabase, configura las variables del servidor descritas en `.env.example`.

