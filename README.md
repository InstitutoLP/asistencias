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

## Ejecución local

Instala las dependencias con `npm install` y ejecuta `npm start`. Para el envío de correo y la conexión a Supabase, configura las variables del servidor descritas en `.env.example`.

## Supabase

La reorganización no requiere ejecutar SQL ni modifica datos existentes. Si la carga de notas informa que falta la columna `grades`, se puede ejecutar de forma segura este SQL aditivo en el editor de Supabase:

```sql
alter table public.students
add column if not exists grades jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
```

No elimina ni reemplaza filas. Si la columna ya existe, no realiza cambios en ella. Para asistencia y otras columnas, revisa primero el esquema actual: `supabase-attendances.sql` también actualiza políticas de acceso aunque sus cambios de columnas sean aditivos.
