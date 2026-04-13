import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch, getName, logout } from '../utils/auth'
import Logo from '../components/Logo'

function ageLabel(birthDate) {
  const now = new Date()
  const birth = new Date(birthDate)
  const months = Math.floor((now - birth) / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 1) return 'menos de 1 mes'
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return `${years} ${years === 1 ? 'ano' : 'anos'}${rem > 0 ? ` e ${rem} ${rem === 1 ? 'mes' : 'meses'}` : ''}`
}

function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
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

export default function FamilyDashboard() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const name = getName()
  const isNew = params.get('novo') === '1'
  const inviteCode = params.get('codigo')

  const [baby, setBaby] = useState(null)
  const [caretaker, setCaretaker] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [caretakerInvite, setCaretakerInvite] = useState(null)
  const [doctorInvite, setDoctorInvite] = useState(null)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [entries, setEntries] = useState([])
  const [report, setReport] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [activeTab, setActiveTab] = useState('hoje')
  const [weightForm, setWeightForm] = useState({ weight_kg: '', height_cm: '', notes: '' })
  const [savingWeight, setSavingWeight] = useState(false)
  const [showInvite, setShowInvite] = useState(isNew)

  useEffect(() => {
    apiFetch('/baby').then(d => {
      setBaby(d.baby)
      setCaretaker(d.caretaker)
      setDoctors(d.doctors || [])
      setCaretakerInvite(d.caretakerInvite)
      setDoctorInvite(d.doctorInvite)
    }).catch(() => {})
    apiFetch('/diary?limit=14').then(setEntries).catch(() => {})
  }, [])

  async function generateInvite(role) {
    setGeneratingInvite(role)
    try {
      const data = await apiFetch('/baby/invite', { method: 'POST', body: JSON.stringify({ role }) })
      if (role === 'caretaker') setCaretakerInvite(data.code)
      else setDoctorInvite(data.code)
    } catch (e) {}
    finally { setGeneratingInvite(false) }
  }

  async function loadReport() {
    setLoadingReport(true)
    try {
      const data = await apiFetch('/reports/weekly')
      setReport(data)
    } catch (e) {
      setReport({ error: e.message })
    } finally {
      setLoadingReport(false)
    }
  }

  async function saveWeight() {
    if (!weightForm.weight_kg) return
    setSavingWeight(true)
    try {
      await apiFetch('/baby/weight', {
        method: 'POST',
        body: JSON.stringify({
          weight_kg: parseFloat(weightForm.weight_kg),
          height_cm: weightForm.height_cm ? parseFloat(weightForm.height_cm) : undefined,
          notes: weightForm.notes,
          recorded_at: new Date().toISOString(),
        })
      })
      setWeightForm({ weight_kg: '', height_cm: '', notes: '' })
    } catch (e) {}
    finally { setSavingWeight(false) }
  }

  const todayEntry = entries[0]?.entry_date === new Date().toISOString().split('T')[0] ? entries[0] : null

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Logo size={30} withText={false} />
        <div style={s.headerCenter}>
          <span style={s.headerName}>Ola, {name}</span>
          {baby && <span style={s.headerSub}>{baby.name} · {ageLabel(baby.birth_date)}</span>}
        </div>
        <button style={s.logoutBtn} onClick={() => { logout(); navigate('/') }}>Sair</button>
      </header>

      {showInvite && baby && (
        <div style={s.inviteBanner}>
          <div style={s.inviteText}><strong>Conta criada!</strong> Compartilhe os codigos com a baba e a pediatra:</div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', margin: '12px 0' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>BABA</div>
              <div style={s.inviteCode}>{caretakerInvite || '—'}</div>
            </div>
            {doctorInvite && (
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>PEDIATRA</div>
                <div style={s.inviteCode}>{doctorInvite}</div>
              </div>
            )}
          </div>
          <button style={s.inviteClose} onClick={() => setShowInvite(false)}>Fechar</button>
        </div>
      )}

      <div style={s.container}>

        {/* Tabs */}
        <div style={s.tabs}>
          {[
            { key: 'hoje', label: 'Hoje' },
            { key: 'historico', label: 'Historico' },
            { key: 'relatorio', label: 'Relatorio semanal' },
            { key: 'crescimento', label: 'Crescimento' },
            { key: 'equipe', label: 'Equipe' },
          ].map(t => (
            <button key={t.key} style={{ ...s.tab, ...(activeTab === t.key ? s.tabActive : {}) }} onClick={() => { setActiveTab(t.key); if (t.key === 'relatorio' && !report) loadReport() }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Hoje */}
        {activeTab === 'hoje' && (
          <div>
            {!todayEntry ? (
              <div style={s.emptyCard}>
                <div style={s.emptyIcon}>📋</div>
                <div style={s.emptyText}>Sem registro hoje ainda.</div>
                <div style={s.emptySubtext}>{caretaker ? `${caretaker.name} ainda nao preencheu o diario de hoje.` : 'Nenhuma baba vinculada ainda.'}</div>
              </div>
            ) : (
              <div>
                {/* Resumo cards */}
                <div style={s.statGrid}>
                  <StatCard label="Refeicoes" value={todayEntry.meals?.length || 0} unit="registradas" color="var(--green)" />
                  <StatCard label="Sono total" value={totalSleep(todayEntry.sleep)} color="#7B5EA7" />
                  <StatCard label="Fraldas" value={(todayEntry.diapers?.xixi || 0) + (todayEntry.diapers?.coco || 0)} unit="trocas" color="var(--coral)" />
                  <StatCard label="Humor" value={HUMOR_EMOJI[todayEntry.mood] || '—'} color="#D4A017" />
                </div>

                {/* Alimentacao */}
                {todayEntry.meals?.length > 0 && (
                  <Card title="Alimentacao hoje">
                    <table style={s.table}>
                      <thead><tr>
                        <Th>Horario</Th><Th>Alimento</Th><Th>Quantidade</Th>
                      </tr></thead>
                      <tbody>
                        {todayEntry.meals.map((m, i) => (
                          <tr key={i}>
                            <Td>{m.time || '—'}</Td>
                            <Td>{m.food}</Td>
                            <Td><span style={{ ...s.pill, background: m.amount === 'recusou' ? '#FDEDEC' : '#EEF5F3', color: m.amount === 'recusou' ? 'var(--error)' : 'var(--green-dark)' }}>{m.amount || '—'}</span></Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}

                {/* Sono */}
                {todayEntry.sleep?.length > 0 && (
                  <Card title="Sono hoje">
                    {todayEntry.sleep.map((sl, i) => (
                      <div key={i} style={s.sleepItem}>
                        <span style={s.sleepTime}>{sl.start} — {sl.end}</span>
                        <span style={s.sleepDur}>{totalSleep([sl])}</span>
                      </div>
                    ))}
                  </Card>
                )}

                {/* Sintomas */}
                {todayEntry.symptoms?.length > 0 && (
                  <Card title="Sintomas reportados">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {todayEntry.symptoms.map(sym => (
                        <span key={sym} style={{ ...s.pill, background: '#FDEDEC', color: 'var(--error)' }}>{sym}</span>
                      ))}
                    </div>
                    {todayEntry.health_notes && <p style={s.notes}>{todayEntry.health_notes}</p>}
                  </Card>
                )}

                {/* Recado */}
                {todayEntry.general_notes && (
                  <Card title={`Recado de ${caretaker?.name || 'baba'}`}>
                    <p style={s.notes}>{todayEntry.general_notes}</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Historico */}
        {activeTab === 'historico' && (
          <div>
            {entries.length === 0 ? (
              <div style={s.emptyCard}><div style={s.emptyIcon}>📅</div><div style={s.emptyText}>Sem registros ainda.</div></div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} style={s.historyCard}>
                  <div style={s.historyHeader}>
                    <strong style={{ fontSize: 15, textTransform: 'capitalize' }}>{fmtDate(entry.entry_date)}</strong>
                    {entry.mood && <span style={{ fontSize: 20 }}>{HUMOR_EMOJI[entry.mood]}</span>}
                  </div>
                  <div style={s.historyStats}>
                    <HistStat label="Refeicoes" val={entry.meals?.length || 0} />
                    <HistStat label="Sono" val={totalSleep(entry.sleep)} />
                    <HistStat label="Fraldas" val={(entry.diapers?.xixi || 0) + (entry.diapers?.coco || 0)} />
                  </div>
                  {entry.symptoms?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {entry.symptoms.map(sym => (
                        <span key={sym} style={{ ...s.pill, fontSize: 11, background: '#FDEDEC', color: 'var(--error)' }}>{sym}</span>
                      ))}
                    </div>
                  )}
                  {entry.general_notes && <p style={{ ...s.notes, marginTop: 8 }}>{entry.general_notes}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* Relatorio */}
        {activeTab === 'relatorio' && (
          <div>
            {loadingReport && (
              <div style={s.emptyCard}>
                <div style={{ ...s.emptyIcon, animation: 'spin 1s linear infinite' }}>⏳</div>
                <div style={s.emptyText}>Gerando analise com IA…</div>
                <div style={s.emptySubtext}>Pode levar alguns segundos</div>
              </div>
            )}
            {!loadingReport && !report && (
              <div style={s.emptyCard}>
                <div style={s.emptyIcon}>📊</div>
                <div style={s.emptyText}>Relatorio semanal</div>
                <div style={s.emptySubtext}>Analise de alimentacao, sono e saude dos ultimos 7 dias com sugestoes personalizadas.</div>
                <button className="btn btn-primary" style={{ width: 'auto', marginTop: 16 }} onClick={loadReport}>Gerar relatorio</button>
              </div>
            )}
            {report?.error && <div className="error-banner">{report.error}</div>}
            {report?.report && (
              <Card title="Relatorio semanal gerado por IA">
                <div style={s.reportText}>
                  {report.report.split('\n').map((line, i) => {
                    if (!line.trim()) return <br key={i} />
                    const isSection = /^\d+\.|^[A-Z]/.test(line) && line.length < 60
                    return <p key={i} style={isSection ? s.reportSection : s.reportParagraph}>{line}</p>
                  })}
                </div>
                <p style={s.reportPeriod}>Periodo: {report.period?.from} a {report.period?.to} · {report.entriesCount} dias registrados</p>
                <button className="btn btn-outline" style={{ width: 'auto', marginTop: 12 }} onClick={loadReport}>Atualizar</button>
              </Card>
            )}
          </div>
        )}

        {/* Equipe */}
        {activeTab === 'equipe' && (
          <div>
            <Card title="Baba vinculada">
              {caretaker ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{caretaker.name[0]}</div>
                  <div><div style={{ fontWeight: 600 }}>{caretaker.name}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{caretaker.email}</div></div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>Nenhuma baba vinculada ainda.</p>
                  {caretakerInvite ? (
                    <div style={{ background: 'var(--sand)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Codigo de convite ativo:</div>
                      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace', color: 'var(--green)' }}>{caretakerInvite}</div>
                    </div>
                  ) : (
                    <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => generateInvite('caretaker')} disabled={generatingInvite === 'caretaker'}>
                      {generatingInvite === 'caretaker' ? 'Gerando...' : 'Gerar codigo de convite'}
                    </button>
                  )}
                </div>
              )}
            </Card>

            <Card title={"Pediatras vinculadas (" + doctors.length + ")"}>
              {doctors.length > 0 && doctors.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF5F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>🩺</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.specialty}{d.crm ? ' · CRM ' + d.crm : ''}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: doctors.length > 0 ? 16 : 0 }}>
                {doctorInvite ? (
                  <div style={{ background: 'var(--sand)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Codigo de convite para nova pediatra:</div>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace', color: 'var(--green)' }}>{doctorInvite}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Link: https://naninha.app/cadastro/medica?codigo={doctorInvite}</div>
                  </div>
                ) : (
                  <button className="btn btn-outline" style={{ width: 'auto' }} onClick={() => generateInvite('doctor')} disabled={generatingInvite === 'doctor'}>
                    {generatingInvite === 'doctor' ? 'Gerando...' : '+ Convidar nova pediatra'}
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Crescimento */}
        {activeTab === 'crescimento' && (
          <div>
            <Card title="Registrar peso e altura">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Peso (kg)</label>
                  <input className="form-input" type="number" step="0.01" placeholder="Ex: 5.8" value={weightForm.weight_kg} onChange={e => setWeightForm(f => ({ ...f, weight_kg: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Altura (cm)</label>
                  <input className="form-input" type="number" step="0.1" placeholder="Ex: 62.5" value={weightForm.height_cm} onChange={e => setWeightForm(f => ({ ...f, height_cm: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Observacao (ex: consulta pediatra)</label>
                <input className="form-input" type="text" value={weightForm.notes} onChange={e => setWeightForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={saveWeight} disabled={savingWeight || !weightForm.weight_kg}>
                {savingWeight ? 'Salvando…' : 'Salvar medicao'}
              </button>
            </Card>
            <div style={s.emptyCard}>
              <div style={s.emptyIcon}>📈</div>
              <div style={s.emptyText}>Grafico de crescimento</div>
              <div style={s.emptySubtext}>Disponivel apos 3 ou mais registros de peso.</div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function StatCard({ label, value, unit, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      {unit && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{unit}</div>}
    </div>
  )
}

function HistStat({ label, val }) {
  return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>{val}</strong> {label}</div>
}

function Th({ children }) {
  return <th style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', letterSpacing: '0.04em' }}>{children}</th>
}
function Td({ children }) {
  return <td style={{ fontSize: 14, padding: '8px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{children}</td>
}

const s = {
  page: { minHeight: '100vh', background: 'var(--sand)' },
  header: { background: 'white', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
  headerCenter: { flex: 1, display: 'flex', flexDirection: 'column' },
  headerName: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  headerSub: { fontSize: 12, color: 'var(--text-muted)' },
  logoutBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' },
  inviteBanner: { background: 'var(--green)', color: 'white', padding: '1rem 1.25rem', textAlign: 'center' },
  inviteText: { fontSize: 14, marginBottom: 8 },
  inviteCode: { fontSize: 32, fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'monospace', margin: '8px 0' },
  inviteLink: { fontSize: 12, opacity: 0.8, marginBottom: 12 },
  inviteClose: { background: 'white', color: 'var(--green)', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600 },
  container: { maxWidth: 640, margin: '0 auto', padding: '1.25rem 1rem' },
  tabs: { display: 'flex', gap: 4, marginBottom: '1.25rem', background: 'white', borderRadius: 'var(--radius-md)', padding: 4, boxShadow: 'var(--shadow-sm)' },
  tab: { flex: 1, padding: '8px 4px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.15s' },
  tabActive: { background: 'var(--green)', color: 'white', fontWeight: 600 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  emptyCard: { background: 'white', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: 'var(--text-muted)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  pill: { display: 'inline-block', padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 },
  sleepItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' },
  sleepTime: { fontSize: 14, color: 'var(--text-primary)' },
  sleepDur: { fontSize: 13, fontWeight: 600, color: 'var(--green)', background: 'var(--green-bg)', padding: '3px 10px', borderRadius: 100 },
  notes: { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', marginTop: 4 },
  historyCard: { background: 'white', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: 10, boxShadow: 'var(--shadow-sm)' },
  historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyStats: { display: 'flex', gap: 16 },
  reportText: { lineHeight: 1.7, color: 'var(--text-primary)' },
  reportSection: { fontWeight: 700, color: 'var(--green-dark)', marginTop: 16, marginBottom: 4, fontSize: 14 },
  reportParagraph: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 },
  reportPeriod: { fontSize: 12, color: 'var(--text-muted)', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 10 },
}
