const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../db/database');
const { auth, requireFamily } = require('../middleware/auth');

router.get('/', requireFamily, async (req, res) => {
  try {
    const baby = await queryOne('SELECT * FROM babies WHERE family_id = $1', [req.user.id]);
    if (!baby) return res.status(404).json({ error: 'Bebe nao encontrado' });
    const caretaker = await queryOne('SELECT id, name, email, created_at FROM caretakers WHERE baby_id = $1', [baby.id]);
    const doctors = await query('SELECT d.id, d.name, d.email, d.crm, d.specialty, db.linked_at FROM doctors d JOIN doctor_baby db ON db.doctor_id = d.id WHERE db.baby_id = $1', [baby.id]);
    const caretakerInv = await queryOne("SELECT code FROM invites WHERE baby_id = $1 AND role = 'caretaker' AND used_by IS NULL ORDER BY created_at DESC LIMIT 1", [baby.id]);
    const doctorInv = await queryOne("SELECT code FROM invites WHERE baby_id = $1 AND role = 'doctor' AND used_by IS NULL ORDER BY created_at DESC LIMIT 1", [baby.id]);
    res.json({ baby, caretaker, doctors, caretakerInvite: caretakerInv?.code, doctorInvite: doctorInv?.code });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/by-token', auth, async (req, res) => {
  try {
    const baby = await queryOne('SELECT * FROM babies WHERE id = $1', [req.user.babyId]);
    if (!baby) return res.status(404).json({ error: 'Bebe nao encontrado' });
    res.json(baby);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/invite', requireFamily, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['caretaker', 'doctor'].includes(role)) return res.status(400).json({ error: 'Role invalido' });
    const baby = await queryOne('SELECT id FROM babies WHERE family_id = $1', [req.user.id]);
    if (!baby) return res.status(404).json({ error: 'Bebe nao encontrado' });
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await query('INSERT INTO invites (id, baby_id, code, role) VALUES ($1,$2,$3,$4)', [uuidv4(), baby.id, code, role]);
    res.json({ code, role });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/weight', auth, async (req, res) => {
  try {
    const { weight_kg, height_cm, head_cm, notes, recorded_at, baby_id } = req.body;
    let babyId = req.user.babyId;

    if (req.user.role === 'family') {
      const baby = await queryOne('SELECT id FROM babies WHERE family_id = $1', [req.user.id]);
      if (!baby) return res.status(404).json({ error: 'Bebe nao encontrado' });
      babyId = baby.id;
    }
    if (req.user.role === 'doctor') {
      if (!baby_id) return res.status(400).json({ error: 'baby_id obrigatorio' });
      const linked = await queryOne('SELECT * FROM doctor_baby WHERE doctor_id = $1 AND baby_id = $2', [req.user.id, baby_id]);
      if (!linked) return res.status(403).json({ error: 'Acesso negado' });
      babyId = baby_id;
    }

    await query('INSERT INTO weight_records (id, baby_id, recorded_by, recorded_by_role, recorded_at, weight_kg, height_cm, head_cm, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [uuidv4(), babyId, req.user.id, req.user.role, recorded_at || new Date().toISOString(), weight_kg, height_cm || null, head_cm || null, notes || null]);
    res.status(201).json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/weight', auth, async (req, res) => {
  try {
    let babyId = req.user.babyId;
    if (req.user.role === 'family') {
      const baby = await queryOne('SELECT id FROM babies WHERE family_id = $1', [req.user.id]);
      babyId = baby?.id;
    }
    const records = await query('SELECT * FROM weight_records WHERE baby_id = $1 ORDER BY recorded_at DESC', [babyId]);
    res.json(records);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
