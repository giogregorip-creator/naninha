import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, getName, logout } from '../utils/auth'
import Logo from '../components/Logo'

function ageLabel(birthDate) {
  const months = Math.floor((Date.now() - new Date(birthDate)) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'menos de 1 mes'
  if (months < 12) return `${months}m`
  const y = Math.floor(months / 12), m = months % 12
  return `${y}a${m > 0 ? m + 'm' : ''}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function totalSleep(sleepArr) {
  if (!sleepArr?.length) return '—'
  let total = 0
  sleepArr.forEach(s => {
    if (!s.start || !s.end) return
    const [sh, sm] = s.start.split(':').map(Number)
    const [eh, em] = s.end.split(':').map(Number)
    let diff = (eh * 60 + em) - (sh * 60 + sm)
    if (diff < 0) diff += 1440
    total += diff
  })
  if (!total) return '—'
  const h = Math.floor(total / 60), m = total % 60
  return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`
}

const HUMOR_EMOJI = { otimo: '😄', bem: '🙂', neutro: '😐', irritado: '😟', mal: '😢' }
const NOTE_TYPES = ['consulta', 'retorno', 'vacinacao', 'emergencia', 'outro']

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const name = getName()
  const [babies, setBabies] = useState([])
  const [selected, setSelected] = useState(null) // baby id
  const [babyData, setBabyData] = useState(null)
  const [diary, setDiary] = useState([])
  const [activeTab, setActiveTab] = useState('diario')
  const [loading, setLoading] = useState(false)

  // Note form
  const [noteForm, setNoteForm] = useState({ note_date: new Date().toISOString().split('T')[0], type: 'consulta', content: '', diagnosis: '', prescription: '', next_appointment: '' })
  const [savingNote, setSavingNote] = useState(false)
  const [savedNote, setSavedNote] = useState(false)

  // Weight form
  const [weightForm, setWeightForm] = useState({ weight_kg: '', height_cm: '', head_cm: '', notes: '' })
  const [savingWeight, setSavingWeight] = useState(false)

  useEffect(() => {
    apiFetch('/doctor/babies').then(setBabies).catch(() => {})
  }, [])

  async function selectBaby(id) {
    setSelected(id)
    setLoading(true)
    try {
      const [data, diaryData] = await Promise.all([
        apiFetch(`/doctor/baby/${id}`),
        apiFetch(`/doctor/baby/${id}/diary?limit=30`)
      ])
      setBabyData(data)
      setDiary(diaryData)
      setActiveTab('diario')
    } catch (e) {}
    finally { setLoading(false) }
  }

  async function saveNote() {
    if (!noteForm.content) return
    setSavingNote(true)
    try {
      await apiFetch(`/doctor/baby/${selected}/notes`, {
        method: 'POST',
        body: JSON.stringify(noteForm)
      })
      setSavedNote(true)
      setTimeout(() => setSavedNote(false), 3000)
      setNoteForm(f => ({ ...f, content: '', diagnosis: '', prescription: '', next_appointment: '' }))
      const data = await apiFetch(`/doctor/baby/${selected}`)
      setBabyData(data)
    } catch (e) {}
    finally { setSavingNote(false) }
  }

  async function saveWeight() {
    if (!weightForm.weight_kg) return
    setSavingWeight(true)
    try {
      await apiFetch(`/doctor/baby/${selected}/weight`, {
        method: 'POST',
        body: JSON.stringify({ ...weightForm, recorded_at: new Date().toISOString() })
      })
      setWeightForm({ weight_kg: '', height_cm: '', head_cm: '', notes: '' })
      const data = await apiFetch(`/doctor/baby/${selected}`)
      setBabyData(data)
    } catch (e) {}
    finally { setSavingWeight(false) }
  }

  const baby = selected ? babies.find(b => b.id === selected) : null

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Logo size={30} withText={false} />
        <div style={s.headerCenter}>
          <span style={s.headerName}>{name}</span>
          <span style={s.headerSub}>{babies.length} {babies.length === 1 ? 'paciente' : 'pacientes'}</span>
        </div>
        <button style={s.logoutBtn} onClick={() => { logout(); navigate('/') }}>Sair</button>
      </header>

      <div style={s.layout}>
        {/* Sidebar: lista de bebes */}
        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Meus pacientes</div>
          {babies.length === 0 && <div style={s.emptyMsg}>Nenhum paciente vinculado ainda.</div>}
          {babies.map(b => (
            <button key={b.id} style={{ ...s.babyBtn, ...(selected === b.id ? s.babyBtnActive : {}) }} onClick={() => selectBaby(b.id)}>
              <div style={{ ...s.avatar, background: selected === b.id ? 'white' : 'var(--green-bg)', color: selected === b.id ? 'var(--green)' : 'var(--green-dark)' }}>
                {b.name[0]}
              </div>
              <div style={s.babyInfo}>
                <div style={s.babyName}>{b.name}</div>
                <div style={s.babySub}>{ageLabel(b.birth_date)} · {b.family_name}</div>
                {b.last_entry && <div style={s.babySub}>Ultimo reg: {fmtDate(b.last_entry)}</div>}
              </div>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main style={s.main}>
          {!selected && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>👶</div>
              <div style={s.emptyText}>Selecione um paciente</div>
              <div style={s.emptySub}>Escolha um bebe na lista ao lado para ver o historico e adicionar anotacoes.</div>
            </div>
          )}

          {selected && loading && (
            <div style={s.emptyState}><div style={{ fontSize: 32 }}>⏳</div><div style={s.emptyText}>Carregando...</div></div>
          )}

          {selected && !loading && babyData && (
            <div>
              {/* Baby header */}
              <div style={s.babyHeader}>
                <div style={s.bigAvatar}>{babyData.baby.name[0]}</div>
                <div>
                  <h2 style={s.babyTitle}>{babyData.baby.name}</h2>
                  <div style={s.babyMeta}>
                    {ageLabel(babyData.baby.birth_date)} &middot; nascido em {fmtDate(babyData.baby.birth_date)} &middot; familia {babyData.baby.family_name}
                    {babyData.caretaker && ` · baba: ${babyData.caretaker.name}`}
                  </div>
                  {babyData.weights[0] && (
                    <div style={s.babyWeight}>
                      Ultimo peso: <strong>{babyData.weights[0].weight_kg} kg</strong>
                      {babyData.weights[0].height_cm && <> &middot; <strong>{babyData.weights[0].height_cm} cm</strong></>}
                      <span style={s.weightDate}> em {fmtDate(babyData.weights[0].recorded_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={s.tabs}>
                {[
                  { key: 'diario', label: 'Diario' },
                  { key: 'consultas', label: 'Minhas consultas' },
                  { key: 'nova', label: '+ Nova anotacao' },
                  { key: 'crescimento', label: 'Crescimento' },
                ].map(t => (
                  <button key={t.key} style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }} onClick={() => setActiveTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Diario */}
              {activeTab === 'diario' && (
                <div>
                  {diary.length === 0 && <EmptyCard icon="📋" text="Sem registros no diario ainda." />}
                  {diary.map(entry => (
                    <div key={entry.id} style={s.entryCard}>
                      <div style={s.entryHeader}>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </strong>
                        {entry.mood && <span style={{ fontSize: 20 }}>{HUMOR_EMOJI[entry.mood]}</span>}
                      </div>
                      <div style={s.entryStats}>
                        <Stat label="Refeicoes" val={entry.meals?.length || 0} />
                        <Stat label="Sono" val={totalSleep(entry.sleep)} />
                        <Stat label="Fraldas" val={(entry.diapers?.xixi || 0) + (entry.diapers?.coco || 0)} />
                      </div>
                      {entry.meals?.length > 0 && (
                        <div style={s.detailBlock}>
                          <span style={s.detailLabel}>Alimentacao: </span>
                          {entry.meals.map((m, i) => <span key={i} style={s.mealTag}>{m.time && `${m.time} `}{m.food}{m.amount ? ` (${m.amount})` : ''}</span>)}
                        </div>
                      )}
                      {entry.symptoms?.length > 0 && (
                        <div style={s.detailBlock}>
                          <span style={s.detailLabel}>Sintomas: </span>
                          {entry.symptoms.map(sym => <span key={sym} style={s.symptomTag}>{sym}</span>)}
                        </div>
                      )}
                      {entry.health_notes && <div style={s.notesText}>{entry.health_notes}</div>}
                      {entry.general_notes && <div style={{ ...s.notesText, borderLeft: '3px solid var(--coral)', paddingLeft: 8 }}><em>"{entry.general_notes}"</em></div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Consultas */}
              {activeTab === 'consultas' && (
                <div>
                  {babyData.clinicalNotes.length === 0 && <EmptyCard icon="📝" text="Nenhuma consulta registrada ainda." />}
                  {babyData.clinicalNotes.map(n => (
                    <div key={n.id} style={s.noteCard}>
                      <div style={s.noteHeader}>
                        <span style={s.noteType}>{n.type}</span>
                        <span style={s.noteDate}>{fmtDate(n.note_date)}</span>
                      </div>
                      <p style={s.noteContent}>{n.content}</p>
                      {n.diagnosis && <div style={s.noteField}><strong>Diagnostico:</strong> {n.diagnosis}</div>}
                      {n.prescription && <div style={s.noteField}><strong>Prescricao:</strong> {n.prescription}</div>}
                      {n.next_appointment && <div style={s.noteField}><strong>Retorno:</strong> {fmtDate(n.next_appointment)}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Nova nota */}
              {activeTab === 'nova' && (
                <div style={s.formCard}>
                  {savedNote && <div style={s.successBanner}>Anotacao salva!</div>}
                  <div style={s.formGrid2}>
                    <div className="form-group">
                      <label className="form-label">Data</label>
                      <input className="form-input" type="date" value={noteForm.note_date} onChange={e => setNoteForm(f => ({ ...f, note_date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select className="form-input" value={noteForm.type} onChange={e => setNoteForm(f => ({ ...f, type: e.target.value }))}>
                        {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Observacoes da consulta</label>
                    <textarea className="form-input" rows={4} placeholder="Descricao da consulta, evolucao do paciente, observacoes clinicas..." value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Diagnostico (opcional)</label>
                    <input className="form-input" type="text" placeholder="Ex: resfriado comum, CID J00" value={noteForm.diagnosis} onChange={e => setNoteForm(f => ({ ...f, diagnosis: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prescricao / conduta (opcional)</label>
                    <textarea className="form-input" rows={2} placeholder="Ex: dipirona 2ml 6/6h por 3 dias" value={noteForm.prescription} onChange={e => setNoteForm(f => ({ ...f, prescription: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data do retorno (opcional)</label>
                    <input className="form-input" type="date" value={noteForm.next_appointment} onChange={e => setNoteForm(f => ({ ...f, next_appointment: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" onClick={saveNote} disabled={savingNote || !noteForm.content} style={{ marginTop: 8 }}>
                    {savingNote ? 'Salvando...' : 'Salvar anotacao'}
                  </button>
                </div>
              )}

              {/* Crescimento */}
              {activeTab === 'crescimento' && (
                <div>
                  <div style={s.formCard}>
                    <div style={s.sectionLabel}>Registrar medicao</div>
                    <div style={s.formGrid3}>
                      <div className="form-group">
                        <label className="form-label">Peso (kg)</label>
                        <input className="form-input" type="number" step="0.01" placeholder="Ex: 6.2" value={weightForm.weight_kg} onChange={e => setWeightForm(f => ({ ...f, weight_kg: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Altura (cm)</label>
                        <input className="form-input" type="number" step="0.1" placeholder="Ex: 64.0" value={weightForm.height_cm} onChange={e => setWeightForm(f => ({ ...f, height_cm: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Perimetro cef. (cm)</label>
                        <input className="form-input" type="number" step="0.1" placeholder="Ex: 40.5" value={weightForm.head_cm} onChange={e => setWeightForm(f => ({ ...f, head_cm: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Observacao</label>
                      <input className="form-input" type="text" placeholder="Ex: consulta de rotina 4 meses" value={weightForm.notes} onChange={e => setWeightForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary" onClick={saveWeight} disabled={savingWeight || !weightForm.weight_kg} style={{ marginTop: 8 }}>
                      {savingWeight ? 'Salvando...' : 'Registrar medicao'}
                    </button>
                  </div>

                  {babyData.weights.length > 0 && (
                    <div style={s.formCard}>
                      <div style={s.sectionLabel}>Historico de medicoes</div>
                      <table style={s.table}>
                        <thead><tr>
                          <Th>Data</Th><Th>Peso</Th><Th>Altura</Th><Th>PC</Th><Th>Registrado por</Th>
                        </tr></thead>
                        <tbody>
                          {babyData.weights.map(w => (
                            <tr key={w.id}>
                              <Td>{fmtDate(w.recorded_at)}</Td>
                              <Td><strong>{w.weight_kg} kg</strong></Td>
                              <Td>{w.height_cm ? `${w.height_cm} cm` : '—'}</Td>
                              <Td>{w.head_cm ? `${w.head_cm} cm` : '—'}</Td>
                              <Td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.recorded_by_role === 'doctor' ? 'medica' : w.recorded_by_role}</span></Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function EmptyCard({ icon, text }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(44,80,72,0.08)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{text}</div>
    </div>
  )
}

function Stat({ label, val }) {
  return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>{val}</strong> {label}</div>
}
function Th({ children }) {
  return <th style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', letterSpacing: '0.04em' }}>{children}</th>
}
function Td({ children }) {
  return <td style={{ fontSize: 14, padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{children}</td>
}

const s = {
  page: { minHeight: '100vh', background: 'var(--sand)', display: 'flex', flexDirection: 'column' },
  header: { background: 'white', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 },
  headerCenter: { flex: 1, display: 'flex', flexDirection: 'column' },
  headerName: { fontSize: 14, fontWeight: 600 },
  headerSub: { fontSize: 12, color: 'var(--text-muted)' },
  logoutBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' },
  layout: { display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 57px)' },
  sidebar: { width: 260, background: 'white', borderRight: '1px solid var(--border)', overflowY: 'auto', flexShrink: 0, padding: '1rem 0' },
  sidebarTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', padding: '0 16px', marginBottom: 8 },
  emptyMsg: { fontSize: 13, color: 'var(--text-muted)', padding: '0 16px' },
  babyBtn: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' },
  babyBtnActive: { background: 'var(--green)' },
  avatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 },
  babyInfo: { flex: 1, minWidth: 0 },
  babyName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  babySub: { fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  main: { flex: 1, overflowY: 'auto', padding: '1.25rem' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', textAlign: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 },
  emptySub: { fontSize: 14, color: 'var(--text-muted)', maxWidth: 300 },
  babyHeader: { display: 'flex', alignItems: 'flex-start', gap: 14, background: 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 1px 3px rgba(44,80,72,0.08)' },
  bigAvatar: { width: 52, height: 52, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--green)', flexShrink: 0 },
  babyTitle: { fontSize: 20, marginBottom: 4 },
  babyMeta: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 },
  babyWeight: { fontSize: 14, color: 'var(--text-primary)' },
  weightDate: { color: 'var(--text-muted)', fontWeight: 400 },
  tabs: { display: 'flex', gap: 4, marginBottom: '1rem', background: 'white', borderRadius: 12, padding: 4, boxShadow: '0 1px 3px rgba(44,80,72,0.08)' },
  tab: { flex: 1, padding: '8px 4px', border: 'none', background: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.15s' },
  tabActive: { background: 'var(--green)', color: 'white', fontWeight: 600 },
  entryCard: { background: 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10, boxShadow: '0 1px 3px rgba(44,80,72,0.08)' },
  entryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  entryStats: { display: 'flex', gap: 16, marginBottom: 8 },
  detailBlock: { marginTop: 8, fontSize: 13 },
  detailLabel: { fontWeight: 600, color: 'var(--text-secondary)' },
  mealTag: { display: 'inline-block', background: 'var(--green-bg)', color: 'var(--green-dark)', borderRadius: 100, padding: '2px 8px', fontSize: 12, marginRight: 4, marginBottom: 4 },
  symptomTag: { display: 'inline-block', background: '#FDEDEC', color: 'var(--error)', borderRadius: 100, padding: '2px 8px', fontSize: 12, marginRight: 4, marginBottom: 4 },
  notesText: { fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 8, lineHeight: 1.5 },
  noteCard: { background: 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10, boxShadow: '0 1px 3px rgba(44,80,72,0.08)', borderLeft: '3px solid var(--green)' },
  noteHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  noteType: { background: 'var(--green-bg)', color: 'var(--green-dark)', borderRadius: 100, padding: '3px 10px', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' },
  noteDate: { fontSize: 13, color: 'var(--text-muted)' },
  noteContent: { fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 8 },
  noteField: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 },
  formCard: { background: 'white', borderRadius: 12, padding: '1.25rem', marginBottom: 12, boxShadow: '0 1px 3px rgba(44,80,72,0.08)', display: 'flex', flexDirection: 'column', gap: '1rem' },
  formGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  formGrid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' },
  successBanner: { background: '#EEF7EE', color: '#2E7D32', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600, textAlign: 'center' },
  table: { width: '100%', borderCollapse: 'collapse' },
}
