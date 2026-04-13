const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'naninha-secret-change-in-prod';

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/auth/register/family
router.post('/register/family', async (req, res) => {
  try {
    const { name, email, password, babyName, babyBirthDate, babyGender, babyBirthWeight, babyBirthHeight } = req.body;
    if (!name || !email || !password || !babyName || !babyBirthDate)
      return res.status(400).json({ error: 'Campos obrigatorios faltando' });

    if (await queryOne('SELECT id FROM families WHERE email = $1', [email]))
      return res.status(409).json({ error: 'Email ja cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    const familyId = uuidv4(), babyId = uuidv4();

    await query('INSERT INTO families (id, name, email, password_hash) VALUES ($1,$2,$3,$4)', [familyId, name, email, hash]);
    await query('INSERT INTO babies (id, family_id, name, birth_date, gender, birth_weight_kg, birth_height_cm) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [babyId, familyId, babyName, babyBirthDate, babyGender || 'outro', babyBirthWeight || null, babyBirthHeight || null]);

    const caretakerCode = genCode();
    await query('INSERT INTO invites (id, baby_id, code, role) VALUES ($1,$2,$3,$4)', [uuidv4(), babyId, caretakerCode, 'caretaker']);

    const token = jwt.sign({ id: familyId, role: 'family', babyId }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, role: 'family', familyName: name, babyName, inviteCode: caretakerCode });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/auth/register/caretaker
router.post('/register/caretaker', async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;
    if (!name || !email || !password || !inviteCode)
      return res.status(400).json({ error: 'Campos obrigatorios faltando' });

    const invite = await queryOne("SELECT * FROM invites WHERE code = $1 AND role = 'caretaker' AND used_by IS NULL", [inviteCode.toUpperCase()]);
    if (!invite) return res.status(404).json({ error: 'Codigo de convite invalido ou ja utilizado' });

    const baby = await queryOne('SELECT * FROM babies WHERE id = $1', [invite.baby_id]);

    if (await queryOne('SELECT id FROM caretakers WHERE email = $1', [email]))
      return res.status(409).json({ error: 'Email ja cadastrado' });

    if (await queryOne('SELECT id FROM caretakers WHERE baby_id = $1', [baby.id]))
      return res.status(409).json({ error: 'Este bebe ja tem uma baba cadastrada' });

    const hash = await bcrypt.hash(password, 10);
    const caretakerId = uuidv4();
    await query('INSERT INTO caretakers (id, name, email, password_hash, baby_id, invite_code_used) VALUES ($1,$2,$3,$4,$5,$6)',
      [caretakerId, name, email, hash, baby.id, inviteCode.toUpperCase()]);
    await query('UPDATE invites SET used_by = $1, used_at = NOW() WHERE id = $2', [caretakerId, invite.id]);

    const token = jwt.sign({ id: caretakerId, role: 'caretaker', babyId: baby.id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, role: 'caretaker', caretakerName: name, babyName: baby.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/auth/register/doctor
router.post('/register/doctor', async (req, res) => {
  try {
    const { name, email, password, crm, specialty, inviteCode } = req.body;
    if (!name || !email || !password || !inviteCode)
      return res.status(400).json({ error: 'Campos obrigatorios faltando' });

    const invite = await queryOne("SELECT * FROM invites WHERE code = $1 AND role = 'doctor' AND used_by IS NULL", [inviteCode.toUpperCase()]);
    if (!invite) return res.status(404).json({ error: 'Codigo de convite invalido ou ja utilizado' });

    const baby = await queryOne('SELECT * FROM babies WHERE id = $1', [invite.baby_id]);

    let doctor = await queryOne('SELECT * FROM doctors WHERE email = $1', [email]);
    if (!doctor) {
      const hash = await bcrypt.hash(password, 10);
      const doctorId = uuidv4();
      await query('INSERT INTO doctors (id, name, email, password_hash, crm, specialty) VALUES ($1,$2,$3,$4,$5,$6)',
        [doctorId, name, email, hash, crm || null, specialty || 'Pediatria']);
      doctor = await queryOne('SELECT * FROM doctors WHERE id = $1', [doctorId]);
    } else {
      const ok = await bcrypt.compare(password, doctor.password_hash);
      if (!ok) return res.status(401).json({ error: 'Senha incorreta para este email' });
    }

    const alreadyLinked = await queryOne('SELECT * FROM doctor_baby WHERE doctor_id = $1 AND baby_id = $2', [doctor.id, baby.id]);
    if (!alreadyLinked) {
      await query('INSERT INTO doctor_baby (doctor_id, baby_id) VALUES ($1,$2)', [doctor.id, baby.id]);
    }
    await query('UPDATE invites SET used_by = $1, used_at = NOW() WHERE id = $2', [doctor.id, invite.id]);

    const babies = await query('SELECT b.* FROM babies b JOIN doctor_baby db ON db.baby_id = b.id WHERE db.doctor_id = $1', [doctor.id]);
    const token = jwt.sign({ id: doctor.id, role: 'doctor' }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, role: 'doctor', doctorName: doctor.name, babiesCount: babies.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatorios' });

    let user = await queryOne('SELECT * FROM families WHERE email = $1', [email]);
    if (user) {
      if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Senha incorreta' });
      const baby = await queryOne('SELECT * FROM babies WHERE family_id = $1', [user.id]);
      const inv = await queryOne("SELECT code FROM invites WHERE baby_id = $1 AND role = 'caretaker' AND used_by IS NULL ORDER BY created_at DESC LIMIT 1", [baby?.id]);
      const token = jwt.sign({ id: user.id, role: 'family', babyId: baby?.id }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, role: 'family', name: user.name, babyName: baby?.name, inviteCode: inv?.code });
    }

    user = await queryOne('SELECT * FROM caretakers WHERE email = $1', [email]);
    if (user) {
      if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Senha incorreta' });
      const baby = await queryOne('SELECT * FROM babies WHERE id = $1', [user.baby_id]);
      const token = jwt.sign({ id: user.id, role: 'caretaker', babyId: user.baby_id }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, role: 'caretaker', name: user.name, babyName: baby?.name });
    }

    user = await queryOne('SELECT * FROM doctors WHERE email = $1', [email]);
    if (user) {
      if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Senha incorreta' });
      const babies = await query('SELECT b.* FROM babies b JOIN doctor_baby db ON db.baby_id = b.id WHERE db.doctor_id = $1', [user.id]);
      const token = jwt.sign({ id: user.id, role: 'doctor' }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({ token, role: 'doctor', name: user.name, babiesCount: babies.length });
    }

    return res.status(401).json({ error: 'Credenciais invalidas' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Sem token' });
  try {
    res.json(jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET));
  } catch { res.status(401).json({ error: 'Token invalido' }); }
});

module.exports = router;
