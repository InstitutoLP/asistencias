const cronHandler = require('../cron-daily-emails');
const { authenticateRequest } = require('../auth-service');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const auth = await authenticateRequest(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }
  }
  return cronHandler(req, res);
};