const {
  handleLogin,
  handleLogout,
  handleRefresh,
} = require('../auth-service');

const handlers = {
  login: handleLogin,
  logout: handleLogout,
  refresh: handleRefresh,
};

module.exports = async function handler(req, res) {
  const action = typeof req.query?.action === 'string' ? req.query.action : '';
  const authHandler = handlers[action];
  if (!authHandler) {
    return res.status(404).json({ error: 'Not Found' });
  }
  return authHandler(req, res);
};
