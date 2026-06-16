import { useState, useRef, useEffect } from 'react'
import client from '../api/client'
import AnalysisResult from '../components/AnalysisResult'

const TABS = [
  { id: 'text',  label: '📝 Text' },
  { id: 'url',   label: '🔗 URL' },
  { id: 'image', label: '🖼️ Image' },
]

export default function Analyze() {
  const [tab, setTab] = useState('text')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [aiStatus, setAiStatus] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    client.get('/ollama/status/').then(r => setAiStatus(r.data)).catch(() => setAiStatus({ running: false }))
  }, [])

  const reset = () => { setResult(null); setError('') }
  const handleTabChange = (t) => { setTab(t); reset() }

  const handleSubmit = async () => {
    setError(''); setResult(null); setLoading(true)
    try {
      let res
      if (tab === 'text') {
        if (!text.trim()) { setError('Please enter some text to analyze.'); setLoading(false); return }
        res = await client.post('/analyze/text/', { content: text })
      } else if (tab === 'url') {
        if (!url.trim()) { setError('Please enter a URL.'); setLoading(false); return }
        res = await client.post('/analyze/url/', { url })
      } else {
        if (!imageFile) { setError('Please select an image.'); setLoading(false); return }
        const fd = new FormData()
        fd.append('image', imageFile)
        res = await client.post('/analyze/image/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please check that your AI engine is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) { setImageFile(file); reset() }
  }

  const clearAll = () => { setText(''); setUrl(''); setImageFile(null); reset() }
  const hasInput = text || url || imageFile

  const loadingText = {
    text: 'Evaluating credibility and searching fact-check databases...',
    url: 'Fetching article, then evaluating credibility...',
    image: 'Reading image content with vision AI...',
  }

  const loadingTime = tab === 'image' || !aiStatus?.groq_active
    ? 'This may take 15–60 seconds with Ollama'
    : 'Usually done in a few seconds with Groq'

  return (
    <div>
      <div className="page-header">
        <h2>Analyze Content</h2>
        <p>AI-powered fact-checking across text, URLs, and images</p>
      </div>

      <div className="card">
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => handleTabChange(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {tab === 'text' && (
          <div className="form-group" style={{ animation: 'fadeIn 0.25s ease' }}>
            <label className="form-label">News article / Post content</label>
            <textarea className="form-input" style={{ minHeight: 220 }}
              placeholder="Paste the news content here — headline, article body, tweet, Facebook post..."
              value={text} onChange={e => { setText(e.target.value); reset() }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              <span>{text.length} characters</span>
              <span>{text.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>
        )}

        {tab === 'url' && (
          <div className="form-group" style={{ animation: 'fadeIn 0.25s ease' }}>
            <label className="form-label">Article URL</label>
            <input className="form-input" type="url"
              placeholder="https://example.com/article/news-title"
              value={url} onChange={e => { setUrl(e.target.value); reset() }} />
          </div>
        )}

        {tab === 'image' && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <div
              className={`dropzone${imageFile ? ' has-file' : ''}${dragOver ? ' drag-over' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { setImageFile(e.target.files[0]); reset() }} />
              {imageFile ? (
                <>
                  <span className="dz-icon">🖼️</span>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{imageFile.name}</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text2)' }}>
                    {(imageFile.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                  <img src={URL.createObjectURL(imageFile)} alt="preview"
                    style={{ maxWidth: 320, maxHeight: 220, marginTop: 14, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                </>
              ) : (
                <>
                  <span className="dz-icon">📤</span>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Drop image here or click to upload</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>JPG, PNG, GIF, WEBP</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text2)' }}>
                    Screenshots of Facebook, Twitter/X, Instagram posts, news articles
                  </div>
                </>
              )}
            </div>
            {!aiStatus?.has_vision_model && aiStatus?.ollama_running && (
              <div className="alert" style={{ marginTop: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }}>
                ⚠️ Image analysis requires Ollama with LLaVA. Run: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 4px', borderRadius: 4 }}>ollama pull llava</code>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ minWidth: 160 }}>
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Analyzing...</>
              : '🔍 Analyze Now'}
          </button>
          {hasInput && !loading && (
            <button className="btn btn-ghost" onClick={clearAll}>Clear</button>
          )}
        </div>
      </div>

      {loading && (
        <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: '44px 24px' }}>
          <div className="loading-ai" style={{ margin: '0 auto 20px' }}>
            <div className="orbit" />
            <div className="orbit" />
            <div className="core" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>AI is analyzing the content...</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{loadingText[tab]}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, opacity: 0.7 }}>{loadingTime}</div>
        </div>
      )}

      {result && <AnalysisResult result={result} />}
    </div>
  )
}
