const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'naninha-secret-change-in-prod';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token nao informado' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

function requireFamily(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'family') return res.status(403).json({ error: 'Acesso restrito a familia' });
    next();
  });
}

function requireCaretaker(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'caretaker') return res.status(403).json({ error: 'Acesso restrito a baba' });
    next();
  });
}

function requireDoctor(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Acesso restrito a medica' });
    next();
  });
}

module.exports = { auth, requireFamily, requireCaretaker, requireDoctor };
