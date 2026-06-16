export default function AnalysisResult({ result }) {
  if (!result) return null

  const v = result.verdict
  const scoreColor = v === 'REAL' ? 'var(--real)' : v === 'FAKE' ? 'var(--fake)' : 'var(--uncertain)'
  const verdictIcon = v === 'REAL' ? '✅' : v === 'FAKE' ? '❌' : '⚠️'
  const verdictLabel = v === 'REAL' ? 'Credible News' : v === 'FAKE' ? 'Likely Fake' : 'Needs Verification'

  const confColor = { HIGH: 'var(--real)', MEDIUM: 'var(--uncertain)', LOW: 'var(--fake)' }[result.confidence_level] || 'var(--text2)'

  const hasClaims = result.key_claims?.length > 0
  const hasMisleading = result.misleading_elements?.length > 0

  return (
    <div className="card result-card" style={{ marginTop: 24, borderColor: `${scoreColor}33` }}>

      {/* ── Header ── */}
      <div className="result-header">
        <div className={`score-ring score-ring-${v.toLowerCase()}`}>
          <span className="score-num">{result.credibility_score}</span>
          <span className="score-label">Score</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24 }}>{verdictIcon}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor }}>{verdictLabel}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <span className={`badge badge-${v.toLowerCase()}`}>{v}</span>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>
              Confidence: <span style={{ fontWeight: 700, color: confColor }}>{result.confidence_level}</span>
            </span>
            {result.detected_category && (
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                Category: <span style={{ fontWeight: 600, color: 'var(--text)' }}>{result.detected_category}</span>
              </span>
            )}
          </div>
          <div className="score-bar-bg" style={{ height: 8 }}>
            <div className="score-bar-fill" style={{
              width: `${result.credibility_score}%`,
              background: `linear-gradient(90deg, ${scoreColor}77, ${scoreColor})`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text2)', marginTop: 5 }}>
            <span>0 — Fake</span><span>50</span><span>100 — Real</span>
          </div>
        </div>
      </div>

      {/* ── Explanation ── */}
      {result.explanation && (
        <div className="result-section">
          <h4>🔎 Analysis</h4>
          <div style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
            fontSize: 14, lineHeight: 1.8, color: 'var(--text)',
          }}>
            {result.explanation}
          </div>
        </div>
      )}

      {/* ── Claims + Misleading side by side if both exist, stacked if only one ── */}
      {(hasClaims || hasMisleading) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: hasClaims && hasMisleading ? '1fr 1fr' : '1fr',
          gap: 16,
        }}>
          {hasClaims && (
            <div className="result-section">
              <h4>📌 Key Claims Identified</h4>
              <ul className="claims-list">
                {result.key_claims.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {hasMisleading && (
            <div className="result-section">
              <h4>🚩 Misleading Elements</h4>
              <ul className="claims-list misleading-list">
                {result.misleading_elements.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
