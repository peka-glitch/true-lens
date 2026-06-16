import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import '../landing.css'

const FEATURES = [
  {
    title: 'Text Analysis',
    desc: 'Paste any claim, headline, or article and get an instant credibility verdict backed by AI reasoning.',
    color: 'var(--accent)',
  },
  {
    title: 'URL Scanner',
    desc: 'Drop any news link. TrueLens fetches the article, scans the domain, and delivers a full fact-check.',
    color: 'var(--real)',
  },
  {
    title: 'Image & Screenshot',
    desc: 'Upload screenshots of social media posts or news images. Our vision AI extracts and verifies the text.',
    color: '#a78bfa',
  },
  {
    title: 'Google Fact Check',
    desc: 'Every analysis queries Snopes, PolitiFact, AFP, Reuters and 100+ fact-checkers in real time.',
    color: 'var(--uncertain)',
  },
  {
    title: 'Credibility Score',
    desc: 'A 0–100 score with verdict (REAL / FAKE / UNCERTAIN), confidence level, and detailed explanation.',
    color: '#f472b6',
  },
  {
    title: 'Full History',
    desc: 'Every analysis is saved to your account. Filter, revisit, and delete your fact-check history anytime.',
    color: 'var(--real)',
  },
]

const STEPS = [
  { num: '01', title: 'Create your account', desc: 'Sign up for free. No credit card required.' },
  { num: '02', title: 'Submit your content', desc: 'Paste text, a URL, or upload an image/screenshot.' },
  { num: '03', title: 'AI runs the check', desc: 'Mistral AI + Google Fact Check API analyse the claim.' },
  { num: '04', title: 'Get your verdict', desc: 'REAL, FAKE, or UNCERTAIN — with a full explanation.' },
]

const STATS = [
  { value: '100+', label: 'Fact-check sources' },
  { value: '3', label: 'Analysis modes' },
  { value: '0–100', label: 'Credibility score' },
  { value: 'Free', label: 'Always' },
]

export default function Landing() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    let raf
    function draw() {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(59,130,246,${p.alpha})`
        ctx.fill()
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > W) p.dx *= -1
        if (p.y < 0 || p.y > H) p.dy *= -1
      })
      raf = requestAnimationFrame(draw)
    }
    draw()

    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <div className="landing">
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* ── Navbar ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <span className="landing-logo">
            <span className="landing-logo-icon">🔎</span>
            TrueLens
          </span>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <Link to="/login" className="lnav-login">Login</Link>
            <Link to="/signup" className="lnav-cta">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="l-hero">
        <div className="l-hero-badge">AI-Powered Fact Checking</div>
        <h1 className="l-hero-title">
          Stop Sharing<br />
          <span className="l-hero-gradient">Fake News.</span>
        </h1>
        <p className="l-hero-sub">
          TrueLens uses local Mistral AI + Google Fact Check to verify any claim,
          article, or image in seconds. REAL, FAKE, or UNCERTAIN — always with evidence.
        </p>
        <div className="l-hero-actions">
          <Link to="/signup" className="btn-hero-primary">Start for Free →</Link>
          <Link to="/login" className="btn-hero-ghost">I have an account</Link>
        </div>

        {/* mock verdict card */}
        <div className="l-hero-card">
          <div className="l-hero-card-top">
            <div className="l-hero-ring fake">
              <span className="l-ring-num">12</span>
              <span className="l-ring-lbl">Score</span>
            </div>
            <div>
              <div className="l-hero-verdict fake">❌ Likely Fake</div>
              <div className="l-hero-meta">
                <span className="badge-fake">FAKE</span>
                <span>Confidence: <b style={{ color: 'var(--fake)' }}>HIGH</b></span>
                <span>Category: <b>Health</b></span>
              </div>
            </div>
          </div>
          <div className="l-hero-explanation">
            This claim was rated <b>"False"</b> by PolitiFact and Snopes. Multiple red
            flags detected: vague sources, sensationalist language, known misinformation domain.
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="l-stats">
        {STATS.map(s => (
          <div key={s.label} className="l-stat">
            <span className="l-stat-val">{s.value}</span>
            <span className="l-stat-lbl">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="l-section" id="features">
        <div className="l-section-tag">What TrueLens can do</div>
        <h2 className="l-section-title">Everything you need to fight misinformation</h2>
        <div className="l-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="l-feature-card">
              <div className="l-feature-bar" style={{ background: f.color }} />
              <h3 style={{ color: f.color }}>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="l-section l-section-dark" id="how">
        <div className="l-section-tag">Simple process</div>
        <h2 className="l-section-title">How it works</h2>
        <div className="l-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className="l-step">
              <div className="l-step-num">{s.num}</div>
              {i < STEPS.length - 1 && <div className="l-step-line" />}
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="l-cta">
        <div className="l-cta-glow" />
        <h2 className="l-cta-title">Ready to verify the truth?</h2>
        <p className="l-cta-sub">Join TrueLens and start fact-checking in seconds. Free, forever.</p>
        <Link to="/signup" className="btn-hero-primary" style={{ fontSize: 17, padding: '16px 48px' }}>
          Create Free Account →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <span className="landing-logo" style={{ fontSize: 16 }}>
          <span className="landing-logo-icon">🔎</span> TrueLens
        </span>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>
          AI-powered fake news detection · Built with Ollama + Django + React
        </span>
      </footer>
    </div>
  )
}
