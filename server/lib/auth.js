/* Senhas (scrypt) e tokens assinados (HMAC-SHA256). Sem dependências. */
const crypto = require('crypto');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return salt + ':' + hash;
}

function checkPassword(pw, stored) {
  if (!stored || stored.indexOf(':') < 0) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pw), salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return ref.length === test.length && crypto.timingSafeEqual(ref, test);
}

function b64u(buf) { return Buffer.from(buf).toString('base64url'); }

function makeTokens(secret) {
  function sign(payload, ttlSeconds) {
    const body = b64u(JSON.stringify(Object.assign({}, payload, { exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    return body + '.' + sig;
  }
  function verify(token) {
    if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
    const [body, sig] = token.split('.');
    const good = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (!p.exp || p.exp < Date.now() / 1000) return null;
      return p;
    } catch (e) { return null; }
  }
  return { sign, verify };
}

function id(prefix) { return (prefix || '') + crypto.randomBytes(8).toString('hex'); }
function code(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

module.exports = { hashPassword, checkPassword, makeTokens, id, code };
