(() => {
  const apiBaseUrl = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : window.location.origin;

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
