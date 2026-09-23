// Simple HTTP Basic Auth gate for the admin endpoints — the browser shows its
// own native username/password prompt, so there's no login page to build and
// no secret sitting visible in a URL. Any username works; only the password
// (ADMIN_PASSWORD) is checked. Returns true if the request is authorized;
// otherwise sends the 401 + WWW-Authenticate challenge itself and returns
// false, so the caller should just `return` when this returns false.
function requireAuth(req, res) {
  const header = req.headers && req.headers.authorization;
  if (header && header.indexOf('Basic ') === 0) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf-8');
    const password = decoded.slice(decoded.indexOf(':') + 1);
    if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
      return true;
    }
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="Ticked Waitlist"');
  res.status(401).send('Authentication required');
  return false;
}

module.exports = { requireAuth };
