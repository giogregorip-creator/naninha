const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');
const { requireFamily } = require('../middleware/auth');

router.get('/weekly', requireFamily, async (req, res) => {
  try {
    const baby = await queryOne('SELECT * FROM babies WHERE family_id = $1', [req.user.id]);
    if (!baby) return res.status(404).json({ error: 'Bebe nao encontrado' });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const from = sevenDaysAgo.toISOString().split('T')[0];

    const entries = await query('SELECT * FROM diary_entries WHERE baby_id = $1 AND entry_date >= $2 ORDER BY entry_date ASC', [baby.id, from]);
    const weights = await query('SELECT * FROM weight_records WHERE baby_id = $1 ORDER BY recorded_at DESC LIMIT 5', [baby.id]);

    if (entries.length === 0) return res.json({ report: null, message: 'Sem registros nesta semana' });

    const ageMonths = Math.floor((Date.now() - new Date(baby.birth_date)) / (1000 * 60 * 60 * 24 * 30.44));
    const prompt = buildPrompt(baby, ageMonths, entries, weights);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    });

    const data = await response.json();
    const reportText = data.content?.[0]?.text || '';
    res.json({ report: reportText, period: { from, to: new Date().toISOString().split('T')[0] }, entriesCount: entries.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao gerar relatorio' }); }
});

function safeJson(str) { try { return str ? JSON.parse(str) : null; } catch { return null; } }

function buildPrompt(baby, ageMonths, entries, weights) {
  const entrySummaries = entries.map(e => {
    const meals = safeJson(e.meals_json) || [];
    const sleep = safeJson(e.sleep_json) || [];
    const diapers = safeJson(e.diapers_json) || {};
    const symptoms = safeJson(e.symptoms_json) || [];
    const totalSleepMin = sleep.reduce((acc, s) => {
      if (!s.start || !s.end) return acc;
      const [sh, sm] = s.start.split(':').map(Number);
      const [eh, em] = s.end.split(':').map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 1440;
      return acc + diff;
    }, 0);
    return `${e.entry_date}: ${meals.length} refeicoes (${meals.map(m => m.food + (m.amount ? ' - ' + m.amount : '')).join(', ')}), sono total aprox ${Math.round(totalSleepMin / 60)}h, humor: ${e.mood || 'nao informado'}, xixi: ${diapers.xixi || 0}, coco: ${diapers.coco || 0}, sintomas: ${symptoms.length ? symptoms.join(', ') : 'nenhum'}${e.general_notes ? ', obs: ' + e.general_notes : ''}`;
  }).join('\n');

  const lw = weights[0];
  return `Voce e um pediatra especialista em desenvolvimento infantil. Analise os dados da semana do bebe ${baby.name} e gere um relatorio em portugues brasileiro informal mas preciso.

DADOS DO BEBE:
- Nome: ${baby.name}
- Idade: ${ageMonths} meses
- Peso ao nascer: ${baby.birth_weight_kg || 'nao informado'} kg
- Peso mais recente: ${lw ? lw.weight_kg + ' kg em ' + new Date(lw.recorded_at).toLocaleDateString('pt-BR') : 'nao registrado'}
- Altura mais recente: ${lw?.height_cm ? lw.height_cm + ' cm' : 'nao registrada'}

REGISTROS DA SEMANA:
${entrySummaries}

Gere um relatorio com as secoes:
1. RESUMO DA SEMANA (2-3 frases)
2. ALIMENTACAO: avalie quantidade, variedade e adequacao para ${ageMonths} meses
3. SONO: avalie duracao e padrao, compare com recomendado para a idade
4. SAUDE: analise sintomas e humor geral
5. CRESCIMENTO: se houver dados, compare com curvas OMS para ${ageMonths} meses
6. ALERTAS: o que merece atencao (linguagem direta, sem alarmar desnecessariamente)
7. SUGESTOES: 2-3 acoes praticas para a proxima semana

Seja direto e util. Sem linguagem generica.`;
}

module.exports = router;
