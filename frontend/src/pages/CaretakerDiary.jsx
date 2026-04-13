import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getName, logout } from '../utils/auth'
import Logo from '../components/Logo'

const TODAY = new Date().toISOString().split('T')[0]

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function CaretakerDiary() {
  const navigate = useNavigate()
  const name = getName()
  const [baby, setBaby] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [humor, setHumor] = useState('')

  const [meals, setMeals] = useState([{ id: 1, time: '', food: '', amount: '' }])
  const [sleeps, setSleeps] = useState([{ id: 1, start: '', end: '' }])
  const [diapers, setDiapers] = useState({ xixi: 0, coco: 0, consistency: '' })
  const [symptoms, setSymptoms] = useState([])
  const [healthNotes, setHealthNotes] = useState('')
  const [activities, setActivities] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')

  const SYMPTOM_LIST = ['febre', 'coriza', 'tosse', 'vomito', 'diarreia', 'irritabilidade', 'dentando', 'vermelhidao', 'medicacao']
  const HUMOR_LIST = [
    { key: 'otimo', label: 'otimo', emoji: '😄' },
    { key: 'bem', label: 'bem', emoji: '🙂' },
    { key: 'neutro', label: 'neutro', emoji: '😐' },
    { key: 'irritado', label: 'irritado', emoji: '😟' },
    { key: 'mal', label: 'mal', emoji: '😢' },
  ]

  useEffect(() => {
    apiFetch('/baby/by-token').then(setBaby).catch(() => {})
    apiFetch('/diary/today').then(entry => {
      if (!entry) return
      if (entry.meals?.length) setMeals(entry.meals.map((m, i) => ({ ...m, id: i + 1 })))
      if (entry.sleep?.length) setSleeps(entry.sleep.map((s, i) => ({ ...s, id: i + 1 })))
      if (entry.diapers) setDiapers(entry.diapers)
      if (entry.mood) setHumor(entry.mood)
      if (entry.symptoms) setSymptoms(entry.symptoms)
      if (entry.health_notes) setHealthNotes(entry.health_notes)
      if (entry.activities) setActivities(entry.activities)
      if (entry.general_notes) setGeneralNotes(entry.general_notes)
    }).catch(() => {})
  }, [])

  function mealSet(id, field, val) {
    setMeals(ms => ms.map(m => m.id === id ? { ...m, [field]: val } : m))
  }
  function sleepSet(id, field, val) {
    setSleeps(ss => ss.map(s => s.id === id ? { ...s, [field]: val } : s))
  }
  function toggleSymptom(s) {
    setSymptoms(ss => ss.includes(s) ? ss.filter(x => x !== s) : [...ss, s])
  }

  function calcSleepDur(start, end) {
    if (!start || !end) return ''
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    let diff = (eh * 60 + em) - (sh * 60 + sm)
    if (diff < 0) diff += 1440
    const h = Math.floor(diff / 60), m = diff % 60
    return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await apiFetch('/diary', {
        method: 'POST',
        body: JSON.stringify({
          entry_date: TODAY,
          meals: meals.filter(m => m.food),
          sleep: sleeps.filter(s => s.start),
          diapers,
          mood: humor,
          symptoms,
          health_notes: healthNotes,
          activities,
          general_notes: generalNotes,
        })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <Logo size={30} withText={false} />
        <div style={s.headerCenter}>
          <span style={s.headerName}>Ola, {name}</span>
          <span style={s.headerDate}>{formatDate(TODAY)}</span>
        </div>
        <button style={s.logoutBtn} onClick={() => { logout(); navigate('/') }}>Sair</button>
      </header>

      <div style={s.container}>
        {baby && (
          <div style={s.babyBadge}>
            <div style={s.babyAvatar}>{baby.name[0]}</div>
            <div>
              <div style={s.babyName}>Diario de {baby.name}</div>
              <div style={s.babyAge}>Registrando o dia de hoje</div>
            </div>
          </div>
        )}

        {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

        {saved && (
          <div style={s.successBanner}>Salvo com sucesso!</div>
        )}

        {/* Alimentacao */}
        <Section title="Alimentacao" icon="🍼">
          {meals.map((meal, idx) => (
            <div key={meal.id} style={s.mealRow}>
              <div style={s.mealNum}>{idx + 1}</div>
              <div className="form-group" style={{ flex: '0 0 90px' }}>
                <label className="form-label">Horario</label>
                <input className="form-input" type="time" value={meal.time} onChange={e => mealSet(meal.id, 'time', e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">O que comeu</label>
                <input className="form-input" type="text" placeholder="Ex: leite materno, papa de banana…" value={meal.food} onChange={e => mealSet(meal.id, 'food', e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: '0 0 100px' }}>
                <label className="form-label">Quantidade</label>
                <select className="form-input" value={meal.amount} onChange={e => mealSet(meal.id, 'amount', e.target.value)}>
                  <option value="">--</option>
                  <option>pouco</option>
                  <option>metade</option>
                  <option>tudo</option>
                  <option>recusou</option>
                </select>
              </div>
              {meals.length > 1 && (
                <button style={s.removeBtn} onClick={() => setMeals(ms => ms.filter(m => m.id !== meal.id))}>✕</button>
              )}
            </div>
          ))}
          <button style={s.addBtn} onClick={() => setMeals(ms => [...ms, { id: Date.now(), time: '', food: '', amount: '' }])}>
            + adicionar refeicao
          </button>
        </Section>

        {/* Sono */}
        <Section title="Sono" icon="😴">
          {sleeps.map((sl, idx) => (
            <div key={sl.id} style={s.sleepRow}>
              <div style={s.mealNum}>{idx + 1}</div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Dormiu as</label>
                <input className="form-input" type="time" value={sl.start} onChange={e => sleepSet(sl.id, 'start', e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Acordou as</label>
                <input className="form-input" type="time" value={sl.end} onChange={e => sleepSet(sl.id, 'end', e.target.value)} />
              </div>
              {sl.start && sl.end && (
                <div style={s.durBadge}>{calcSleepDur(sl.start, sl.end)}</div>
              )}
              {sleeps.length > 1 && (
                <button style={{ ...s.removeBtn, marginTop: 18 }} onClick={() => setSleeps(ss => ss.filter(s => s.id !== sl.id))}>✕</button>
              )}
            </div>
          ))}
          <button style={s.addBtn} onClick={() => setSleeps(ss => [...ss, { id: Date.now(), start: '', end: '' }])}>
            + adicionar periodo de sono
          </button>
        </Section>

        {/* Fralda */}
        <Section title="Fralda" icon="🧷">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Xixi</label>
              <CounterInput value={diapers.xixi} onChange={v => setDiapers(d => ({ ...d, xixi: v }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Coco</label>
              <CounterInput value={diapers.coco} onChange={v => setDiapers(d => ({ ...d, coco: v }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Consistencia</label>
              <select className="form-input" value={diapers.consistency} onChange={e => setDiapers(d => ({ ...d, consistency: e.target.value }))}>
                <option value="">--</option>
                <option>normal</option>
                <option>mole</option>
                <option>duro</option>
                <option>liquido</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Humor */}
        <Section title="Humor do dia" icon="💛">
          <div style={s.humorGrid}>
            {HUMOR_LIST.map(h => (
              <button key={h.key} style={{ ...s.humorBtn, ...(humor === h.key ? s.humorBtnActive : {}) }} onClick={() => setHumor(h.key)}>
                <span style={{ fontSize: 24 }}>{h.emoji}</span>
                <span style={{ fontSize: 12 }}>{h.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Saude */}
        <Section title="Saude e sintomas" icon="🩺">
          <div style={s.tagRow}>
            {SYMPTOM_LIST.map(sym => (
              <button key={sym} style={{ ...s.tag, ...(symptoms.includes(sym) ? s.tagActive : {}) }} onClick={() => toggleSymptom(sym)}>
                {sym}
              </button>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Observacoes</label>
            <textarea className="form-input" rows={2} placeholder="Ex: tomou dipirona 14h, temperatura 37.8…" value={healthNotes} onChange={e => setHealthNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </Section>

        {/* Atividades */}
        <Section title="Atividades" icon="⭐">
          <div className="form-group">
            <textarea className="form-input" rows={2} placeholder="Ex: brincou no tapete, reagiu ao nome, sentou com apoio…" value={activities} onChange={e => setActivities(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </Section>

        {/* Observacoes */}
        <Section title="Recado para os pais" icon="📝">
          <div className="form-group">
            <textarea className="form-input" rows={3} placeholder="Qualquer informacao importante para a mae ou o pai ao chegar em casa…" value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </Section>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginBottom: '2rem' }}>
          {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar diario de hoje'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={s.sectionHeader}>
        <span style={s.sectionIcon}>{icon}</span>
        <span style={s.sectionTitle}>{title}</span>
      </div>
      <div style={s.sectionBody}>{children}</div>
    </div>
  )
}

function CounterInput({ value, onChange }) {
  return (
    <div style={s.counter}>
      <button style={s.counterBtn} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span style={s.counterVal}>{value}</span>
      <button style={s.counterBtn} onClick={() => onChange(value + 1)}>+</button>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'var(--sand)' },
  header: {
    background: 'white', borderBottom: '1px solid var(--border)',
    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
    position: 'sticky', top: 0, zIndex: 10,
  },
  headerCenter: { flex: 1, display: 'flex', flexDirection: 'column' },
  headerName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  headerDate: { fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' },
  logoutBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, color: 'var(--text-muted)',
  },
  container: { maxWidth: 600, margin: '0 auto', padding: '1.25rem 1rem' },
  babyBadge: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'white', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem',
    marginBottom: '1.25rem', boxShadow: 'var(--shadow-sm)',
  },
  babyAvatar: {
    width: 44, height: 44, borderRadius: '50%', background: 'var(--green-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700, color: 'var(--green)',
  },
  babyName: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' },
  babyAge: { fontSize: 13, color: 'var(--text-muted)' },
  successBanner: {
    background: '#EEF7EE', color: '#2E7D32', borderRadius: 'var(--radius-sm)',
    padding: '10px 14px', fontSize: 14, fontWeight: 600, marginBottom: '1rem',
    textAlign: 'center',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' },
  sectionBody: {
    background: 'white', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
    boxShadow: 'var(--shadow-sm)',
  },
  mealRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  sleepRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  mealNum: {
    width: 22, height: 22, borderRadius: '50%', background: 'var(--green-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: 'var(--green)', flexShrink: 0, marginTop: 22,
  },
  durBadge: {
    background: 'var(--green-bg)', color: 'var(--green-dark)',
    borderRadius: 100, padding: '4px 10px', fontSize: 12, fontWeight: 600,
    alignSelf: 'flex-end', marginBottom: 2, whiteSpace: 'nowrap',
  },
  addBtn: {
    background: 'none', border: '1.5px dashed var(--border)', color: 'var(--green)',
    borderRadius: 'var(--radius-sm)', padding: '8px 14px', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, width: '100%', marginTop: 4,
  },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: 14, padding: '0 4px', marginTop: 22,
  },
  humorGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  humorBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 4px', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)', background: 'var(--sand)',
    cursor: 'pointer', transition: 'all 0.15s', color: 'var(--text-secondary)',
  },
  humorBtnActive: {
    border: '2px solid var(--green)', background: 'var(--green-bg)', color: 'var(--green-dark)',
  },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: {
    padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500,
    border: '1.5px solid var(--border)', background: 'var(--sand)',
    cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.15s',
  },
  tagActive: {
    background: 'var(--green-bg)', color: 'var(--green-dark)', border: '1.5px solid var(--green)',
  },
  counter: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'var(--sand)', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border)', padding: '6px 10px',
  },
  counterBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 18, color: 'var(--green)', fontWeight: 700, lineHeight: 1, padding: '0 2px',
  },
  counterVal: { flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 },
}
