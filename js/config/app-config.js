(() => {
  const apiBaseUrl = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : window.location.origin;
  const authSessionKey = 'supabaseAuthSession';
  let refreshPromise = null;
  const nativeFetch = window.fetch.bind(window);

  const getAuthSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(authSessionKey) || 'null');
    } catch (error) {
      sessionStorage.removeItem(authSessionKey);
      return null;
    }
  };

  const setAuthSession = (session) => {
    if (!session?.access_token || !session?.refresh_token) {
      throw new Error('Supabase devolvió una sesión incompleta.');
    }
    sessionStorage.setItem(authSessionKey, JSON.stringify(session));
  };

  const clearAuthSession = () => {
    sessionStorage.removeItem(authSessionKey);
  };

  const refreshAuthSession = async () => {
    const currentSession = getAuthSession();
    if (!currentSession?.refresh_token) return false;
    if (!refreshPromise) {
      refreshPromise = nativeFetch(`${apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentSession.refresh_token }),
      }).then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.session?.access_token) {
          clearAuthSession();
          sessionStorage.removeItem('activeUser');
          return false;
        }
        setAuthSession(result.session);
        if (result.user) sessionStorage.setItem('activeUser', JSON.stringify(result.user));
        return true;
      }).catch((error) => {
        clearAuthSession();
        sessionStorage.removeItem('activeUser');
        console.error('No se pudo renovar la sesión:', error);
        return false;
      }).finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  };

  const apiFetch = async (input, options = {}) => {
    const requestUrl = new URL(
      typeof input === 'string' || input instanceof URL ? input.toString() : input.url,
      window.location.href,
    );
    const isApplicationApi = requestUrl.origin === window.location.origin
      && requestUrl.pathname.startsWith('/api/');
    const headers = new Headers(
      options.headers || (input instanceof Request ? input.headers : undefined),
    );
    const session = isApplicationApi ? getAuthSession() : null;
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
    const requestInput = typeof input === 'string' || input instanceof URL
      ? requestUrl.toString()
      : input;
    const response = await nativeFetch(requestInput, { ...options, headers });
    if (!isApplicationApi || response.status !== 401
      || requestUrl.pathname.startsWith('/api/auth/refresh')
      || requestUrl.pathname.startsWith('/api/auth/login')) {
      return response;
    }

    if (!await refreshAuthSession()) return response;
    const refreshedSession = getAuthSession();
    const retryHeaders = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
    retryHeaders.set('Authorization', `Bearer ${refreshedSession.access_token}`);
    return nativeFetch(requestInput, { ...options, headers: retryHeaders });
  };

  // Utilidad universal para prevenir inyecciones XSS al renderizar texto dinámico en HTML
  window.escapeHTML = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  window.APP_CONFIG = Object.freeze({
    apiBaseUrl,
    api: Object.freeze({
      students: `${apiBaseUrl}/api/students`,
      attendance: `${apiBaseUrl}/api/attendance`,
      sendEmail: `${apiBaseUrl}/api/send-email`,
      sendWhatsApp: `${apiBaseUrl}/api/send-whatsapp`,
      sendDailyEmails: `${apiBaseUrl}/api/cron-daily-emails`,
      syncState: `${apiBaseUrl}/api/sync-state`,
      authLogin: `${apiBaseUrl}/api/auth/login`,
      authLogout: `${apiBaseUrl}/api/auth/logout`,
    }),
  });

  window.apiFetch = apiFetch;
  window.getSupabaseAuthSession = getAuthSession;
  window.setSupabaseAuthSession = setAuthSession;
  window.clearSupabaseAuthSession = clearAuthSession;
})();
