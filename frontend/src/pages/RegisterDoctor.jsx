import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import Logo from '../components/Logo'
import { saveAuth, apiFetch } from '../utils/auth'

export default function RegisterDoctor() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    crm: '', specialty: 'Pediatria',
    inviteCode: params.get('codigo') || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Informe seu nome')
    if (!form.email.trim()) return setError('Informe seu e-mail')
    if (form.password.length < 6) return setError('Senha deve ter pelo menos 6 caracteres')
    if (form.password !== form.confirmPassword) return setError('As senhas nao conferem')
    if (!form.inviteCode.trim()) return setError('Informe o codigo de convite')
    setLoading(true)
    try {
      const data = await apiFetch('/auth/register/doctor', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password,
          crm: form.crm, specialty: form.specialty,
          inviteCode: form.inviteCode.trim().toUpperCase(),
        })
      })
      saveAuth(data.token, data.role, data.doctorName)
      navigate('/app/medica')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.bg} aria-hidden><div style={s.blob} /></div>
      <div style={s.container}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }} className="animate-up">
          <Logo size={40} />
        </div>
        <div className="card animate-up delay-1">
          <div style={s.roleTag}>
            <span>🩺</span>
            <span>Cadastro de pediatra / medica</span>
          </div>
          <h2 style={s.title}>Crie sua conta</h2>
          <p style={s.subtitle}>Voce precisa de um codigo de convite enviado pela familia.</p>
          {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={s.form}>
            <div className="form-group">
              <label className="form-label">Codigo de convite</label>
              <input className="form-input" type="text" placeholder="Ex: XY34AB"
                value={form.inviteCode} onChange={set('inviteCode')}
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}
                maxLength={6} />
            </div>
            <div className="divider" />
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input className="form-input" type="text" placeholder="Dra. Ana Lima" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail profissional</label>
              <input className="form-input" type="email" placeholder="dra@clinica.com.br" value={form.email} onChange={set('email')} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">CRM (opcional)</label>
                <input className="form-input" type="text" placeholder="12345/SP" value={form.crm} onChange={set('crm')} />
              </div>
              <div className="form-group">
                <label className="form-label">Especialidade</label>
                <select className="form-input" value={form.specialty} onChange={set('specialty')}>
                  <option>Pediatria</option>
                  <option>Neonatologia</option>
                  <option>Nutricao infantil</option>
                  <option>Outro</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" placeholder="Minimo 6 caracteres" value={form.password} onChange={set('password')} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar senha</label>
              <input className="form-input" type="password" placeholder="Repita a senha" value={form.confirmPassword} onChange={set('confirmPassword')} />
            </div>
            <p style={s.hint}>Se voce ja tem conta no Naninha, use seu email e senha existentes com o novo codigo de convite.</p>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>
        </div>
        <p style={s.footer}>Ja tem conta? <Link to="/">Entrar</Link></p>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden' },
  bg: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' },
  blob: { position: 'absolute', top: '-10%', right: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(74,124,111,0.07)' },
  container: { width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 },
  roleTag: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EEF5F3', color: '#2E5048', borderRadius: 100, padding: '6px 14px', fontSize: 13, fontWeight: 600, marginBottom: '1rem' },
  title: { fontSize: 20, marginBottom: '0.25rem' },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  hint: { fontSize: 12, color: 'var(--text-muted)', background: 'var(--sand)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 },
  footer: { textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: '1rem' },
}
