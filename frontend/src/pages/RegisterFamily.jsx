import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { saveAuth, apiFetch } from '../utils/auth'

const STEPS = ['Sua conta', 'Dados do bebe']

export default function RegisterFamily() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    babyName: '', babyBirthDate: '', babyGender: '',
    babyBirthWeight: '', babyBirthHeight: '',
  })

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function validateStep0() {
    if (!form.name.trim()) return 'Informe seu nome'
    if (!form.email.trim()) return 'Informe seu e-mail'
    if (form.password.length < 6) return 'Senha deve ter pelo menos 6 caracteres'
    if (form.password !== form.confirmPassword) return 'As senhas nao conferem'
    return null
  }

  function validateStep1() {
    if (!form.babyName.trim()) return 'Informe o nome do bebe'
    if (!form.babyBirthDate) return 'Informe a data de nascimento'
    return null
  }

  function handleNext(e) {
    e.preventDefault()
    setError('')
    const err = validateStep0()
    if (err) { setError(err); return }
    setStep(1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const err = validateStep1()
    if (err) { setError(err); return }
    setLoading(true)
    try {
      const data = await apiFetch('/auth/register/family', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          babyName: form.babyName,
          babyBirthDate: form.babyBirthDate,
          babyGender: form.babyGender || 'outro',
          babyBirthWeight: form.babyBirthWeight ? parseFloat(form.babyBirthWeight) : undefined,
          babyBirthHeight: form.babyBirthHeight ? parseFloat(form.babyBirthHeight) : undefined,
        })
      })
      saveAuth(data.token, data.role, data.familyName)
      navigate('/app/familia?novo=1&codigo=' + data.inviteCode)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg} aria-hidden><div style={styles.blob} /></div>

      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }} className="animate-up">
          <Logo size={40} />
        </div>

        <div className="card animate-up delay-1">
          {/* Progress */}
          <div style={styles.progress}>
            {STEPS.map((s, i) => (
              <div key={i} style={styles.progressItem}>
                <div style={{
                  ...styles.progressDot,
                  background: i <= step ? 'var(--green)' : 'var(--border)',
                  color: i <= step ? 'white' : 'var(--text-muted)',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, color: i <= step ? 'var(--green)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>
                  {s}
                </span>
              </div>
            ))}
            <div style={styles.progressLine}>
              <div style={{ ...styles.progressFill, width: step === 0 ? '0%' : '100%' }} />
            </div>
          </div>

          {error && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

          {step === 0 && (
            <form onSubmit={handleNext} style={styles.form}>
              <h2 style={styles.stepTitle}>Crie sua conta</h2>
              <div className="form-group">
                <label className="form-label">Seu nome</label>
                <input className="form-input" type="text" placeholder="Ex: Giovanna" value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" placeholder="Minimo 6 caracteres" value={form.password} onChange={set('password')} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar senha</label>
                <input className="form-input" type="password" placeholder="Repita a senha" value={form.confirmPassword} onChange={set('confirmPassword')} />
              </div>
              <button className="btn btn-primary" type="submit" style={{ marginTop: 8 }}>
                Continuar →
              </button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmit} style={styles.form}>
              <h2 style={styles.stepTitle}>Dados do bebe</h2>
              <div className="form-group">
                <label className="form-label">Nome do bebe</label>
                <input className="form-input" type="text" placeholder="Ex: Lucas" value={form.babyName} onChange={set('babyName')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Data de nascimento</label>
                <input className="form-input" type="date" value={form.babyBirthDate} onChange={set('babyBirthDate')} required max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label className="form-label">Sexo</label>
                <select className="form-input" value={form.babyGender} onChange={set('babyGender')}>
                  <option value="">Prefiro nao informar</option>
                  <option value="M">Menino</option>
                  <option value="F">Menina</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Peso ao nascer (kg)</label>
                  <input className="form-input" type="number" step="0.01" min="0.5" max="6" placeholder="Ex: 3.25" value={form.babyBirthWeight} onChange={set('babyBirthWeight')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Altura ao nascer (cm)</label>
                  <input className="form-input" type="number" step="0.1" min="30" max="65" placeholder="Ex: 49.5" value={form.babyBirthHeight} onChange={set('babyBirthHeight')} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => { setError(''); setStep(0) }} style={{ flex: '0 0 auto', width: 'auto', padding: '12px 20px' }}>
                  ← Voltar
                </button>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Cadastrando...' : 'Criar conta'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={styles.footer}>
          Ja tem conta? <Link to="/">Entrar</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden',
  },
  bg: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' },
  blob: {
    position: 'absolute', top: '-20%', left: '-20%',
    width: 600, height: 600, borderRadius: '50%',
    background: 'rgba(232,137,106,0.07)',
  },
  container: { width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 },
  progress: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem',
    position: 'relative',
  },
  progressItem: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  progressDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, flexShrink: 0,
    transition: 'all 0.3s',
  },
  progressLine: {
    position: 'absolute', left: 14, right: 14, top: 14, height: 2,
    background: 'var(--border)', zIndex: -1,
  },
  progressFill: {
    height: '100%', background: 'var(--green)', transition: 'width 0.4s ease',
  },
  stepTitle: { fontSize: 18, marginBottom: '1rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  footer: { textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: '1rem' },
}
