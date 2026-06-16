import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

export default function Signup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await axios.post('http://localhost:8000/api/auth/register/', form)
      await login(form.username, form.password)
      navigate('/app')
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const messages = Object.values(data).flat()
        setError(messages[0] || 'Registration failed.')
      } else {
        setError('Could not connect to server.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />

      <div className="auth-card">
        <Link to="/" className="auth-logo" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <span className="auth-logo-icon">🔍</span>
          <h1>TrueLens</h1>
          <p>Create your free account</p>
        </Link>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" placeholder="Choose a username"
              value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-input" type="email" placeholder="your@email.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="At least 8 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" placeholder="Repeat your password"
              value={form.password2} onChange={e => setForm({ ...form, password2: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, padding: '13px' }} disabled={loading}>
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Creating account...</>
              : '→ Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
