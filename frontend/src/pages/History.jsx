import { useEffect, useState, Fragment } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import AnalysisResult from '../components/AnalysisResult'

export default function History() {
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ verdict: '', type: '' })
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchHistory = async () => {
    setLoading(true)
    const params = {}
    if (filters.verdict) params.verdict = filters.verdict
    if (filters.type) params.type = filters.type
    const r = await client.get('/history/', { params })
    setAnalyses(r.data)
    setLoading(false)
  }

  useEffect(() => { fetchHistory() }, [filters])

  const handleDelete = async (id) => {
    setDeleting(id)
    await client.delete(`/analysis/${id}/`)
    setAnalyses(prev => prev.filter(a => a.id !== id))
    if (expanded === id) setExpanded(null)
    setDeleting(null)
  }

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id)

  const verdictColor = (v) =>
    v === 'REAL' ? 'var(--real)' : v === 'FAKE' ? 'var(--fake)' : 'var(--uncertain)'

  return (
    <div>
      <div className="page-header">
        <h2>Analysis History</h2>
        <p>All your past fake news analyses</p>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="filter-group">
            {[
              { value: '', label: 'All' },
              { value: 'REAL', label: '✅ Real' },
              { value: 'FAKE', label: '❌ Fake' },
              { value: 'UNCERTAIN', label: '⚠️ Uncertain' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`filter-chip${filters.verdict === opt.value ? ' active-verdict' : ''}`}
                onClick={() => setFilters({ ...filters, verdict: opt.value })}
              >{opt.label}</button>
            ))}
          </div>

          <div className="filter-group">
            {[
              { value: '', label: 'All Types' },
              { value: 'text',  label: '📝 Text' },
              { value: 'url',   label: '🔗 URL' },
              { value: 'image', label: '🖼️ Image' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`filter-chip${filters.type === opt.value ? ' active-type' : ''}`}
                onClick={() => setFilters({ ...filters, type: opt.value })}
              >{opt.label}</button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text2)', alignSelf: 'center' }}>
            {analyses.length} result{analyses.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="loading-block">
            <div className="loading-ai">
              <div className="orbit" /><div className="orbit" /><div className="core" />
            </div>
            <span>Loading history...</span>
          </div>
        ) : analyses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No analyses found</h3>
            <p>{filters.verdict || filters.type ? 'Try changing the filters' : 'Start by analyzing some content'}</p>
            <Link to="/app/analyze" className="btn btn-primary" style={{ marginTop: 16 }}>+ New Analysis</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Content</th>
                  <th>Verdict</th>
                  <th>Score</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a, i) => (
                  <Fragment key={a.id}>
                    <tr
                      style={{ cursor: 'pointer', animation: `fadeUp 0.3s ease both`, animationDelay: `${i * 0.04}s` }}
                      onClick={() => toggleExpand(a.id)}
                    >
                      <td><span className={`badge badge-${a.analysis_type}`}>{a.analysis_type}</span></td>
                      <td className="td-truncate">{a.input_content}</td>
                      <td>
                        <span className={`badge badge-${a.verdict.toLowerCase()}`}>
                          {a.verdict === 'REAL' ? '✅' : a.verdict === 'FAKE' ? '❌' : '⚠️'} {a.verdict}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 16, color: verdictColor(a.verdict) }}>
                          {a.credibility_score}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: 13 }}>{a.detected_category || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 13 }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(a.id)}>
                            {expanded === a.id ? '▲' : '▼'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(a.id)}
                            disabled={deleting === a.id}
                          >
                            {deleting === a.id ? '…' : '🗑'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === a.id && (
                      <tr className="expand-row">
                        <td colSpan={7}>
                          <div className="expand-content" style={{ padding: '16px 20px' }}>
                            <AnalysisResult result={a} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
