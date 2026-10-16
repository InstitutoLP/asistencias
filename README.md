Asistencias de estudiantes 

## Bloqueo de notas

Para habilitar que Andy bloquee o desbloquee columnas, configura estas variables tanto en el `.env` local como en las variables de entorno del despliegue:

- `ANDY_LOCK_PASSWORD`: contraseña de inicio de sesión de Andy.
- `GRADE_LOCK_AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres usado para firmar tokens temporales.

Genera un secreto con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Reinicia o vuelve a desplegar la aplicación después de configurar las variables. Si no están configuradas, Andy no podrá iniciar sesión y las notas no se podrán bloquear desde el módulo.
