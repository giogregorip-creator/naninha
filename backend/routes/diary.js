const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne } = require('../db/database');
const { auth, requireCaretaker } = require('../middleware/auth');

function safeJson(str) {
  try { return str ? JSON.parse(str) : null; } catch { return null; }
}

function parseEntry(r) {
  return { ...r, meals: safeJson(r.meals_json), sleep: safeJson(r.sleep_json), diapers: safeJson(r.diapers_json), symptoms: safeJson(r.symptoms_json) };
}

router.post('/', requireCaretaker, async (req, res) => {
  try {
    const { entry_date, meals, sleep, diapers, mood, symptoms, health_notes, activities, general_notes } = req.body;
    const babyId = req.user.babyId;
    const existing = await queryOne('SELECT id FROM diary_entries WHERE baby_id = $1 AND entry_date = $2', [babyId, entry_date]);

    if (existing) {
      await query(`UPDATE diary_entries SET meals_json=$1, sleep_json=$2, diapers_json=$3, mood=$4, symptoms_json=$5, health_notes=$6, activities=$7, general_notes=$8 WHERE id=$9`,
        [JSON.stringify(meals), JSON.stringify(sleep), JSON.stringify(diapers), mood, JSON.stringify(symptoms), health_notes, activities, general_notes, existing.id]);
      return res.json({ ok: true, updated: true });
    }

    await query(`INSERT INTO diary_entries (id, baby_id, caretaker_id, entry_date, meals_json, sleep_json, diapers_json, mood, symptoms_json, health_notes, activities, general_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [uuidv4(), babyId, req.user.id, entry_date, JSON.stringify(meals), JSON.stringify(sleep), JSON.stringify(diapers), mood, JSON.stringify(symptoms), health_notes, activities, general_notes]);
    res.status(201).json({ ok: true, created: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    let q = 'SELECT * FROM diary_entries WHERE baby_id = $1';
    const params = [req.user.babyId];
    let i = 2;
    if (from) { q += ` AND entry_date >= $${i++}`; params.push(from); }
    if (to) { q += ` AND entry_date <= $${i++}`; params.push(to); }
    q += ' ORDER BY entry_date DESC';
    if (limit) { q += ` LIMIT $${i++}`; params.push(parseInt(limit)); }
    const rows = await query(q, params);
    res.json(rows.map(parseEntry));
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.get('/today', requireCaretaker, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const row = await queryOne('SELECT * FROM diary_entries WHERE baby_id = $1 AND entry_date = $2', [req.user.babyId, today]);
    if (!row) return res.json(null);
    res.json(parseEntry(row));
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
