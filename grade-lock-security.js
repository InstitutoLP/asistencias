const crypto = require('crypto');

const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

const getSecret = () => {
  const secret = process.env.GRADE_LOCK_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('GRADE_LOCK_AUTH_SECRET debe tener al menos 32 caracteres.');
  }
  return secret;
};

const sign = (payload, secret) => crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('base64url');

const issueGradeLockToken = (password) => {
  const expectedPassword = process.env.ANDY_LOCK_PASSWORD;
  if (!expectedPassword) {
    throw new Error('Falta configurar ANDY_LOCK_PASSWORD en el servidor.');
  }
  if (typeof password !== 'string') return null;

  const supplied = Buffer.from(password);
  const expected = Buffer.from(expectedPassword);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

  const payload = Buffer.from(JSON.stringify({
    role: 'grade-lock-manager',
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
  })).toString('base64url');
  return `${payload}.${sign(payload, getSecret())}`;
};

const hasGradeLockToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') return false;
  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  if (scheme !== 'Bearer' || !token) return false;

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;

  let expectedSignature;
  try {
    expectedSignature = sign(payload, getSecret());
  } catch (error) {
    console.error('No se pudo validar el token de bloqueo:', error.message);
    return false;
  }
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claims.role === 'grade-lock-manager'
      && Number.isFinite(claims.expiresAt)
      && claims.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

module.exports = { issueGradeLockToken, hasGradeLockToken };
