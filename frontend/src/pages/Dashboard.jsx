import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import client from '../api/client'

function VerdictBadge({ verdict }) {
  const icon = verdict === 'REAL' ? '✅' : verdict === 'FAKE' ? '❌' : '⚠️'
  return <span className={`badge badge-${verdict.toLowerCase()}`}>{icon} {verdict}</span>
}
function TypeBadge({ type }) {
  return <span className={`badge badge-${type}`}>{type}</span>
}

function StatCard({ value, label, icon, className, delay }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    let start = 0
    const end = Number(value)
    if (end === 0) return
    const step = Math.ceil(end / 20)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setDisplayed(end); clearInterval(timer) }
      else setDisplayed(start)
    }, 40)
    return () => clearInterval(timer)
  }, [value])

  return (
    <div className={`stat-card ${className}`} style={{ animationDelay: delay }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{displayed}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/stats/').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="loading-block">
        <div className="loading-ai">
          <div className="orbit" />
          <div className="orbit" />
          <div className="core" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Welcome back, <span style={{ color: 'var(--accent)' }}>{user?.username}</span> 👋</h2>
          <p>Here's your misinformation analysis overview</p>
        </div>
        <Link to="/app/analyze" className="btn btn-primary">+ New Analysis</Link>
      </div>

      <div className="stats-grid">
        <StatCard value={stats?.total ?? 0}                      label="Total Analyses"  icon="📊" className="stat-total"     delay="0s" />
        <StatCard value={stats?.verdict_counts?.REAL ?? 0}       label="Real News"       icon="✅" className="stat-real"      delay="0.08s" />
        <StatCard value={stats?.verdict_counts?.FAKE ?? 0}       label="Fake News"       icon="❌" className="stat-fake"      delay="0.16s" />
        <StatCard value={stats?.verdict_counts?.UNCERTAIN ?? 0}  label="Uncertain"       icon="⚠️" className="stat-uncertain" delay="0.24s" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="card card-animate" style={{ animationDelay: '0.1s' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 }}>
            Analyses by Type
          </h3>
          {[
            { key: 'text',  label: 'Text',  color: 'var(--accent)', icon: '📝' },
            { key: 'url',   label: 'URL',   color: '#c084fc',       icon: '🔗' },
            { key: 'image', label: 'Image', color: '#f472b6',       icon: '🖼️' },
          ].map(t => {
            const count = stats?.by_type?.[t.key] ?? 0
            const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0
            return (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40 }}>{t.label}</span>
                <div style={{ flex: 1 }}>
                  <div className="score-bar-bg">
                    <div className="score-bar-fill" style={{ width: `${pct}%`, background: t.color }} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.color, minWidth: 24, textAlign: 'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card card-animate" style={{ animationDelay: '0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Analyses</h3>
          <Link to="/app/history" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            View all →
          </Link>
        </div>

        {(!stats?.recent || stats.recent.length === 0) ? (
          <div className="empty-state" style={{ padding: '36px 0' }}>
            <div className="empty-icon">📰</div>
            <h3>No analyses yet</h3>
            <p>Analyze a news article, URL, or screenshot to get started</p>
            <Link to="/app/analyze" className="btn btn-primary" style={{ marginTop: 20 }}>Start Analyzing</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th><th>Content</th><th>Verdict</th><th>Score</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((a, i) => (
                  <tr key={a.id} style={{ animation: `fadeUp 0.3s ease both`, animationDelay: `${i * 0.06}s` }}>
                    <td><TypeBadge type={a.analysis_type} /></td>
                    <td className="td-truncate">{a.input_content}</td>
                    <td><VerdictBadge verdict={a.verdict} /></td>
                    <td>
                      <span style={{
                        fontWeight: 800, fontSize: 16,
                        color: a.verdict === 'REAL' ? 'var(--real)' : a.verdict === 'FAKE' ? 'var(--fake)' : 'var(--uncertain)'
                      }}>{a.credibility_score}</span>
                    </td>
                    <td style={{ color: 'var(--text2)', fontSize: 13 }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
