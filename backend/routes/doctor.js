const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../db/database');
const { requireDoctor } = require('../middleware/auth');

function safeJson(str) { try { return str ? JSON.parse(str) : null; } catch { return null; } }
function parseEntry(r) { return { ...r, meals: safeJson(r.meals_json), sleep: safeJson(r.sleep_json), diapers: safeJson(r.diapers_json), symptoms: safeJson(r.symptoms_json) }; }

router.get('/babies', requireDoctor, async (req, res) => {
  try {
    const babies = await query(`
      SELECT b.*, f.name as family_name, f.email as family_email,
        (SELECT entry_date FROM diary_entries WHERE baby_id = b.id ORDER BY entry_date DESC LIMIT 1) as last_entry,
        (SELECT weight_kg FROM weight_records WHERE baby_id = b.id ORDER BY recorded_at DESC LIMIT 1) as last_weight,
        (SELECT recorded_at FROM weight_records WHERE baby_id = b.id ORDER BY recorded_at DESC LIMIT 1) as last_weight_at,
        (SELECT note_date FROM clinical_notes WHERE baby_id = b.id AND doctor_id = $1 ORDER BY note_date DESC LIMIT 1) as last_consultation
      FROM babies b
      JOIN doctor_baby db ON db.baby_id = b.id
      JOIN families f ON f.id = b.family_id
      WHERE db.doctor_id = $1
      ORDER BY b.name ASC
    `, [req.user.id]);
    res.json(babies);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/baby/:babyId', requireDoctor, async (req, res) => {
  try {
    const { babyId } = req.params;
    const linked = await queryOne('SELECT * FROM doctor_baby WHERE doctor_id = $1 AND baby_id = $2', [req.user.id, babyId]);
    if (!linked) return res.status(403).json({ error: 'Acesso negado' });

    const baby = await queryOne('SELECT b.*, f.name as family_name, f.email as family_email FROM babies b JOIN families f ON f.id = b.family_id WHERE b.id = $1', [babyId]);
    const caretaker = await queryOne('SELECT id, name, email FROM caretakers WHERE baby_id = $1', [babyId]);
    const weights = await query('SELECT * FROM weight_records WHERE baby_id = $1 ORDER BY recorded_at DESC LIMIT 20', [babyId]);
    const clinicalNotes = await query('SELECT * FROM clinical_notes WHERE baby_id = $1 AND doctor_id = $2 ORDER BY note_date DESC', [babyId, req.user.id]);
    res.json({ baby, caretaker, weights, clinicalNotes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/baby/:babyId/diary', requireDoctor, async (req, res) => {
  try {
    const { babyId } = req.params;
    const linked = await queryOne('SELECT * FROM doctor_baby WHERE doctor_id = $1 AND baby_id = $2', [req.user.id, babyId]);
    if (!linked) return res.status(403).json({ error: 'Acesso negado' });

    const { from, to, limit } = req.query;
    let q = 'SELECT * FROM diary_entries WHERE baby_id = $1';
    const params = [babyId]; let i = 2;
    if (from) { q += ` AND entry_date >= $${i++}`; params.push(from); }
    if (to) { q += ` AND entry_date <= $${i++}`; params.push(to); }
    q += ' ORDER BY entry_date DESC';
    if (limit) { q += ` LIMIT $${i++}`; params.push(parseInt(limit)); }
    const rows = await query(q, params);
    res.json(rows.map(parseEntry));
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/baby/:babyId/notes', requireDoctor, async (req, res) => {
  try {
    const { babyId } = req.params;
    const linked = await queryOne('SELECT * FROM doctor_baby WHERE doctor_id = $1 AND baby_id = $2', [req.user.id, babyId]);
    if (!linked) return res.status(403).json({ error: 'Acesso negado' });
    const { note_date, type, content, diagnosis, prescription, next_appointment } = req.body;
    if (!content) return res.status(400).json({ error: 'Conteudo obrigatorio' });
    const id = uuidv4();
    await query(`INSERT INTO clinical_notes (id, baby_id, doctor_id, note_date, type, content, diagnosis, prescription, next_appointment) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, babyId, req.user.id, note_date || new Date().toISOString().split('T')[0], type || 'consulta', content, diagnosis || null, prescription || null, next_appointment || null]);
    res.status(201).json({ ok: true, id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/baby/:babyId/notes', requireDoctor, async (req, res) => {
  try {
    const { babyId } = req.params;
    const linked = await queryOne('SELECT * FROM doctor_baby WHERE doctor_id = $1 AND baby_id = $2', [req.user.id, babyId]);
    if (!linked) return res.status(403).json({ error: 'Acesso negado' });
    const notes = await query('SELECT * FROM clinical_notes WHERE baby_id = $1 AND doctor_id = $2 ORDER BY note_date DESC', [babyId, req.user.id]);
    res.json(notes);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/baby/:babyId/weight', requireDoctor, async (req, res) => {
  try {
    const { babyId } = req.params;
    const linked = await queryOne('SELECT * FROM doctor_baby WHERE doctor_id = $1 AND baby_id = $2', [req.user.id, babyId]);
    if (!linked) return res.status(403).json({ error: 'Acesso negado' });
    const { weight_kg, height_cm, head_cm, notes, recorded_at } = req.body;
    if (!weight_kg) return res.status(400).json({ error: 'Peso obrigatorio' });
    await query('INSERT INTO weight_records (id, baby_id, recorded_by, recorded_by_role, recorded_at, weight_kg, height_cm, head_cm, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [uuidv4(), babyId, req.user.id, 'doctor', recorded_at || new Date().toISOString(), weight_kg, height_cm || null, head_cm || null, notes || null]);
    res.status(201).json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
