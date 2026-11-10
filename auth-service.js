const SUPABASE_URL = (process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_AUTH_KEY = process.env.SUPABASE_ANON_KEY || SUPABASE_KEY;

const profileColumns = [
  'user_id',
  'login_username',
  'display_name',
  'allowed_years',
  'allowed_subjects',
  'allowed_subjects_by_year',
  'can_add_students',
  'can_view_personal_data',
  'is_admin',
  'solo_admin',
  'solo_reports',
  'can_view_reports',
  'can_manage_activities',
  'can_manage_report_cards',
  'can_manage_pending_subjects',
].join(',');

const getResponseData = async (response) => response.json().catch(() => ({}));

const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY && SUPABASE_AUTH_KEY);

const supabaseRequest = (path, options = {}) => fetch(`${SUPABASE_URL}${path}`, {
  ...options,
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  },
});

const authRequest = (path, options = {}) => fetch(`${SUPABASE_URL}/auth/v1${path}`, {
  ...options,
  headers: {
    apikey: SUPABASE_AUTH_KEY,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  },
});

const getProfile = async (filter) => {
  const response = await supabaseRequest(
    `/rest/v1/teacher_profiles?select=${profileColumns}&${filter}`,
  );
  const data = await getResponseData(response);
  if (!response.ok) {
    throw new Error(data.message || data.error || 'No se pudo consultar el perfil del usuario.');
  }
  return Array.isArray(data) && data.length === 1 ? data[0] : null;
};

const getProfileByUsername = (username) => getProfile(
  `login_username=eq.${encodeURIComponent(username)}`,
);

const getProfileByUserId = (userId) => getProfile(
  `user_id=eq.${encodeURIComponent(userId)}`,
);

const getSupabaseUserEmail = async (userId) => {
  const response = await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  const data = await getResponseData(response);
  if (!response.ok) {
    throw new Error(data.message || data.msg || 'No se pudo consultar la cuenta de autenticación.');
  }
  return data.email;
};

const toClientProfile = (profile) => ({
  username: profile.login_username,
  name: profile.display_name,
  allowedYears: profile.allowed_years || [],
  allowedSubjects: profile.allowed_subjects?.length ? profile.allowed_subjects : null,
  allowedSubjectsByYear: profile.allowed_subjects_by_year || {},
  puedeAgregarEstudiantes: profile.can_add_students === true,
  puedeVerDatosPersonales: profile.can_view_personal_data === true,
  esAdmin: profile.is_admin === true,
  soloAdmin: profile.solo_admin === true,
  soloReportes: profile.solo_reports === true,
  puedeVerReportes: profile.can_view_reports === true,
  puedeGestionarActividades: profile.can_manage_activities === true,
  puedeGestionarBoletas: profile.can_manage_report_cards === true,
  puedeGestionarPendientes: profile.can_manage_pending_subjects === true,
});

const sendError = (res, status, message) => res.status(status).json({ error: message });

const handleLogin = async (req, res) => {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed');
  }
  if (!isConfigured()) {
    return sendError(res, 500, 'Falta configurar Supabase en el servidor.');
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!username || !password || username.length > 120 || password.length > 1024) {
    return sendError(res, 400, 'Escribe tu usuario y contraseña.');
  }

  try {
    const profile = await getProfileByUsername(username);
    if (!profile) {
      return sendError(res, 401, 'Usuario o contraseña incorrectos.');
    }

    const email = await getSupabaseUserEmail(profile.user_id);
    if (typeof email !== 'string' || !email) {
      return sendError(res, 401, 'La cuenta no tiene un correo válido para iniciar sesión.');
    }

    const response = await authRequest('/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const session = await getResponseData(response);
    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        return sendError(res, 401, 'Usuario o contraseña incorrectos.');
      }
      console.error('Supabase Auth login failed:', session.message || session.msg || response.status);
      return sendError(res, 502, 'No se pudo validar el inicio de sesión con Supabase.');
    }
    if (session.user?.id !== profile.user_id || !session.access_token || !session.refresh_token) {
      return sendError(res, 401, 'La cuenta de Supabase no coincide con el perfil asignado.');
    }

    return res.status(200).json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
      user: toClientProfile(profile),
    });
  } catch (error) {
    console.error('Supabase Auth login error:', error);
    return sendError(res, 500, 'No se pudo completar el inicio de sesión.');
  }
};

const handleRefresh = async (req, res) => {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed');
  }
  if (!isConfigured()) {
    return sendError(res, 500, 'Falta configurar Supabase en el servidor.');
  }

  const refreshToken = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token : '';
  if (!refreshToken) {
    return sendError(res, 400, 'La sesión no tiene un token de renovación.');
  }

  try {
    const response = await authRequest('/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const session = await getResponseData(response);
    if (!response.ok) {
      return sendError(res, 401, 'La sesión venció. Inicia sesión nuevamente.');
    }

    const profile = await getProfileByUserId(session.user?.id);
    if (!profile || !session.access_token || !session.refresh_token) {
      return sendError(res, 403, 'La cuenta no tiene un perfil habilitado en la aplicación.');
    }

    return res.status(200).json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
      user: toClientProfile(profile),
    });
  } catch (error) {
    console.error('Supabase Auth refresh error:', error);
    return sendError(res, 500, 'No se pudo renovar la sesión.');
  }
};

const handleLogout = async (req, res) => {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method Not Allowed');
  }
  const accessToken = req.headers?.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return sendError(res, 401, 'No hay una sesión activa.');
  }

  try {
    const response = await authRequest('/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok && response.status !== 401) {
      const data = await getResponseData(response);
      console.error('Supabase Auth logout failed:', data.message || data.msg || response.status);
      return sendError(res, 502, 'No se pudo cerrar la sesión en Supabase.');
    }
    return res.status(204).end();
  } catch (error) {
    console.error('Supabase Auth logout error:', error);
    return sendError(res, 502, 'No se pudo cerrar la sesión en Supabase.');
  }
};

const authenticateRequest = async (req) => {
  if (!isConfigured()) {
    return { ok: false, status: 500, error: 'Falta configurar Supabase en el servidor.' };
  }
  const accessToken = req.headers?.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return { ok: false, status: 401, error: 'Inicia sesión para continuar.' };
  }

  try {
    const response = await authRequest('/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return { ok: false, status: 401, error: 'La sesión venció. Inicia sesión nuevamente.' };
    }
    const user = await getResponseData(response);
    const profile = user?.id ? await getProfileByUserId(user.id) : null;
    if (!profile) {
      return { ok: false, status: 403, error: 'La cuenta no tiene un perfil habilitado en la aplicación.' };
    }
    return { ok: true, user, profile };
  } catch (error) {
    console.error('Session validation request failed:', error);
    return { ok: false, status: 502, error: 'No se pudo validar la sesión con Supabase.' };
  }
};

const requireTeacherSession = async (req, res, next) => {
  try {
    const result = await authenticateRequest(req);
    if (!result.ok) {
      return sendError(res, result.status, result.error);
    }
    req.authUser = result.user;
    req.authProfile = result.profile;
    return next();
  } catch (error) {
    console.error('Session validation error:', error);
    return sendError(res, 500, 'No se pudo validar la sesión.');
  }
};

module.exports = {
  authenticateRequest,
  handleLogin,
  handleLogout,
  handleRefresh,
  requireTeacherSession,
  toClientProfile,
};
