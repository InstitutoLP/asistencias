(() => {
  const apiBaseUrl = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : window.location.origin;

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
    }),
  });
})();
