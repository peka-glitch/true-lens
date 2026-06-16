import json
import re
import base64
import os
from urllib.parse import urlparse

import requests as http_requests
from bs4 import BeautifulSoup
from ddgs import DDGS
from django.conf import settings

# ── AI clients (cached at module level) ───────────────────────────────────────

GROQ_API_KEY = os.getenv('GROQ_API_KEY', '').strip()

_groq_client = None
_ollama_client = None


def _groq():
    global _groq_client
    if _groq_client is None and GROQ_API_KEY:
        from groq import Groq
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client


def _ollama():
    global _ollama_client
    if _ollama_client is None:
        try:
            import ollama
            _ollama_client = ollama.Client(host=settings.OLLAMA_HOST)
        except Exception:
            pass
    return _ollama_client


# ── Domain reputation lists ───────────────────────────────────────────────────

CREDIBLE_DOMAINS = {
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'nytimes.com', 'theguardian.com', 'washingtonpost.com',
    'lemonde.fr', 'lefigaro.fr', 'liberation.fr', 'leparisien.fr',
    'who.int', 'cdc.gov', 'nih.gov', 'un.org', 'europa.eu',
    'snopes.com', 'politifact.com', 'factcheck.org', 'fullfact.org',
}

FAKE_DOMAINS = {
    'infowars.com', 'naturalnews.com', 'beforeitsnews.com',
    'worldnewsdailyreport.com', 'empirenews.net', 'yournewswire.com',
    'newspunch.com', 'neonnettle.com', 'worldtruth.tv',
}

# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are TrueLens, an expert fact-checker. Evaluate claims for accuracy and return structured JSON verdicts.

CRITICAL FACTS (use these directly):
- Donald Trump won the 2024 US presidential election. He IS the current US President as of 2025. Claims that he IS president = REAL.
- Joe Biden was president 2021-2025. He is NOT the current president in 2025. Claims that Biden IS current president = FAKE.
- Donald Trump, Joe Biden, Barack Obama, Elon Musk are all ALIVE as of 2025. Claims they are dead = FAKE.
- If someone asks "is X dead?" about a living person → the implied claim is FAKE.
- AI is thriving and not dead. "AI is dead" = FAKE.
- Vaccines do NOT cause autism — this has been repeatedly debunked. "Vaccines cause autism" = FAKE.
- The Earth is round/spherical. "Earth is flat" = FAKE.
- The moon landing happened. "Moon landing was faked" = FAKE.

RULES:
- Be decisive. UNCERTAIN only when you truly cannot know.
- Score 0-39 = FAKE. Score 40-64 = UNCERTAIN. Score 65-100 = REAL. Verdict must match score.
- Return ONLY valid JSON. No markdown. No text outside the JSON."""

ANALYSIS_PROMPT = """Fact-check the following claim.

CLAIM: "{content}"

EVIDENCE FROM SNOPES / POLITIFACT:
{fact_checks}

SIGNALS: {signals}

Is the CLAIM true or false? Use the evidence and your own knowledge.
- If the evidence or your knowledge confirms the claim → REAL, score 70-100
- If the evidence or your knowledge contradicts the claim → FAKE, score 0-30
- If genuinely unknown → UNCERTAIN, score 40-60

Output ONLY this JSON object, nothing else:
{{
  "verdict": "REAL",
  "credibility_score": 95,
  "confidence_level": "HIGH",
  "detected_category": "Politics",
  "key_claims": ["what the claim says"],
  "misleading_elements": [],
  "explanation": "2-3 sentences explaining the verdict",
  "recommendations": ["how to verify"]
}}"""

IMAGE_PROMPT = """You are a fact-checker analyzing an image for misinformation.

Step 1: Read every word of text visible in the image.
Step 2: Identify the main claim being made.
Step 3: Based on your knowledge, is that claim TRUE or FALSE?

Output ONLY this JSON:
{{
  "verdict": "REAL or FAKE or UNCERTAIN",
  "credibility_score": <0-100 integer>,
  "confidence_level": "HIGH or MEDIUM or LOW",
  "detected_category": "<Politics / Health / Science / Technology / Entertainment / etc>",
  "key_claims": ["<exact claim found in the image>"],
  "misleading_elements": ["<what is wrong or misleading, empty list if nothing>"],
  "explanation": "<Quote what the image says, then explain whether it is true or false and why>",
  "recommendations": ["<how to verify>"]
}}"""

# ── Core AI chat ──────────────────────────────────────────────────────────────

def _chat_groq(prompt: str) -> str:
    client = _groq()
    if not client:
        raise RuntimeError("Groq client not available")
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=1024,
    )
    return response.choices[0].message.content


def _chat_ollama(prompt: str, model: str = None, images: list = None) -> str:
    client = _ollama()
    if not client:
        raise RuntimeError("Ollama client not available")
    model = model or settings.OLLAMA_TEXT_MODEL
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    if images:
        messages[-1]["images"] = images
    response = client.chat(model=model, messages=messages, options={"temperature": 0.1})
    if hasattr(response, "message"):
        m = response.message
        return m.content if hasattr(m, "content") else str(m)
    if isinstance(response, dict):
        return response.get("message", {}).get("content", "")
    return str(response)


def _chat(prompt: str, images: list = None) -> str:
    """Groq (text) → Ollama fallback. Images always go to Ollama/llava."""
    if images:
        return _chat_ollama(prompt, model=settings.OLLAMA_VISION_MODEL, images=images)
    try:
        return _chat_groq(prompt)
    except Exception:
        return _chat_ollama(prompt)


# ── Fact-checking & signals ───────────────────────────────────────────────────

def _duckduckgo_fact_check(query: str) -> str:
    q = query.strip()[:150]
    results = []
    try:
        ddgs = DDGS()
        for site, name in [("snopes.com", "Snopes"), ("politifact.com", "PolitiFact")]:
            try:
                hits = list(ddgs.text(f"site:{site} {q}", max_results=3))
                if hits:
                    for h in hits:
                        title = h.get("title", "").strip()
                        body = h.get("body", "").strip()[:200]
                        results.append(f"{name}: \"{title}\" — {body}")
                else:
                    results.append(f"{name}: No matching articles found.")
            except Exception as e:
                results.append(f"{name}: Search failed ({e})")
    except Exception as e:
        return f"Fact-check search unavailable: {e}"
    return "\n".join(results)


def _check_signals(content: str, url: str = "") -> str:
    signals = []
    text = content.lower()

    bad_phrases = [
        "they don't want you to know", "share before deleted",
        "mainstream media hiding", "wake up sheeple",
        "deep state", "plandemic", "new world order",
        "miracle cure", "doctors hate", "cure for cancer",
    ]
    found = [p for p in bad_phrases if p in text]
    if found:
        signals.append(f"RED FLAG: Suspicious phrases detected: {found}")

    words = content.split()
    if words and sum(1 for w in words if w.isupper() and len(w) > 2) / len(words) > 0.25:
        signals.append("RED FLAG: Excessive ALL-CAPS (common in fake headlines)")

    if content.count("!") > 3:
        signals.append(f"RED FLAG: {content.count('!')} exclamation marks (emotional manipulation)")

    if any(v in text for v in ["sources say", "some experts", "people are saying", "according to insiders"]):
        signals.append("RED FLAG: Vague or unnamed sources")

    if url:
        try:
            domain = urlparse(url).netloc.lower().lstrip("www.")
            base = ".".join(domain.split(".")[-2:])
            if domain in CREDIBLE_DOMAINS or base in CREDIBLE_DOMAINS:
                signals.append(f"CREDIBLE SOURCE: {domain} is a trusted outlet")
            elif domain in FAKE_DOMAINS or base in FAKE_DOMAINS:
                signals.append(f"KNOWN FAKE SITE: {domain} is a known misinformation source")
            elif any(domain.endswith(t) for t in [".xyz", ".tk", ".ml", ".top", ".click"]):
                signals.append(f"SUSPICIOUS DOMAIN: {domain} uses a TLD associated with fake sites")
        except Exception:
            pass

    return "\n".join(signals) if signals else "No automatic red flags detected."


# ── Response parsing ──────────────────────────────────────────────────────────

def _parse_response(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text).strip()

    # Extract the JSON object if surrounded by other text
    m = re.search(r"\{[\s\S]*", text)
    if m:
        text = m.group()

    def try_parse(s):
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            pass
        # Try progressively closing truncated JSON
        for suffix in ["}", '"}', '"]}', '"]}'  , ']\n}', '"\n]\n}']:
            try:
                return json.loads(s + suffix)
            except json.JSONDecodeError:
                pass
        # Last resort: extract fields with regex
        return None

    data = try_parse(text)

    # If JSON parse completely failed, try extracting verdict/score with regex
    if data is None:
        verdict_m = re.search(r'"verdict"\s*:\s*"(REAL|FAKE|UNCERTAIN)"', text, re.I)
        score_m   = re.search(r'"credibility_score"\s*:\s*(\d+)', text)
        conf_m    = re.search(r'"confidence_level"\s*:\s*"(HIGH|MEDIUM|LOW)"', text, re.I)
        expl_m    = re.search(r'"explanation"\s*:\s*"([^"]{10,})"', text)
        cat_m     = re.search(r'"detected_category"\s*:\s*"([^"]+)"', text)
        if verdict_m:
            data = {
                "verdict": verdict_m.group(1).upper(),
                "credibility_score": int(score_m.group(1)) if score_m else 50,
                "confidence_level": conf_m.group(1).upper() if conf_m else "LOW",
                "detected_category": cat_m.group(1) if cat_m else "General",
                "key_claims": [],
                "misleading_elements": [],
                "explanation": expl_m.group(1) if expl_m else "",
                "recommendations": [],
            }
        else:
            return _fallback()

    verdict = str(data.get("verdict", "UNCERTAIN")).upper()
    if verdict not in ("REAL", "FAKE", "UNCERTAIN"):
        verdict = "UNCERTAIN"

    try:
        score = max(0, min(100, int(data.get("credibility_score", 50))))
    except (TypeError, ValueError):
        score = 50

    # Enforce consistency between score and verdict
    if score <= 39 and verdict in ("UNCERTAIN", "REAL"):
        verdict = "FAKE"
    elif score >= 65 and verdict in ("UNCERTAIN", "FAKE"):
        verdict = "REAL"

    conf = str(data.get("confidence_level", "MEDIUM")).upper()
    if conf not in ("LOW", "MEDIUM", "HIGH"):
        conf = "MEDIUM"

    def to_list(val):
        if isinstance(val, list):
            return [str(x) for x in val if x]
        return [str(val)] if val else []

    return {
        "verdict": verdict,
        "credibility_score": score,
        "confidence_level": conf,
        "detected_category": str(data.get("detected_category", "General"))[:100],
        "key_claims": to_list(data.get("key_claims")),
        "misleading_elements": to_list(data.get("misleading_elements")),
        "explanation": str(data.get("explanation", ""))[:4000],
        "recommendations": to_list(data.get("recommendations")),
    }


def _fallback():
    return {
        "verdict": "UNCERTAIN",
        "credibility_score": 50,
        "confidence_level": "LOW",
        "detected_category": "Unknown",
        "key_claims": [],
        "misleading_elements": [],
        "explanation": "The AI model returned an unexpected response. Please try again.",
        "recommendations": ["Try again", "Verify through trusted news sources"],
    }


# ── Status check ──────────────────────────────────────────────────────────────

def ollama_status() -> dict:
    groq_active = bool(GROQ_API_KEY)
    ollama_models = []
    ollama_running = False

    try:
        client = _ollama()
        if client:
            result = client.list()
            models = result.models if hasattr(result, "models") else result.get("models", [])
            for m in models:
                name = getattr(m, "model", None) or getattr(m, "name", None)
                if not name and isinstance(m, dict):
                    name = m.get("model") or m.get("name")
                if name:
                    ollama_models.append(name)
            ollama_running = True
    except Exception:
        pass

    return {
        "running": groq_active or ollama_running,
        "groq_active": groq_active,
        "ollama_running": ollama_running,
        "models": ollama_models,
        "has_text_model": groq_active or any(settings.OLLAMA_TEXT_MODEL in n for n in ollama_models),
        "has_vision_model": any(settings.OLLAMA_VISION_MODEL in n for n in ollama_models),
    }


# ── Public API ────────────────────────────────────────────────────────────────

_LIVING = ['trump', 'biden', 'obama', 'elon musk', 'musk', 'bill gates',
           'zuckerberg', 'macron', 'putin', 'modi', 'zelensky', 'kim jong']


def _make_result(verdict, score, conf, cat, claims, misleading, explanation, recs):
    return {
        'verdict': verdict, 'credibility_score': score,
        'confidence_level': conf, 'detected_category': cat,
        'key_claims': claims, 'misleading_elements': misleading,
        'explanation': explanation, 'recommendations': recs,
    }


def _rule_based_check(claim: str) -> dict | None:
    """Returns an instant result for well-known facts, or None to fall through to AI."""
    c = claim.lower().strip().rstrip('?')

    # "is X dead?" or "X is dead" for known living people → FAKE
    for person in _LIVING:
        if person in c and ('dead' in c or 'died' in c or 'death' in c):
            return _make_result('FAKE', 2, 'HIGH', 'General',
                [claim], [],
                f'{person.title()} is alive. Claims about their death are false.',
                ['Check any major news outlet for current status.'])

    # Biden as current president → FAKE (Trump won 2024)
    if 'biden' in c and ('current president' in c or 'still president' in c or 'president of' in c):
        return _make_result('FAKE', 5, 'HIGH', 'Politics',
            [claim], ['Biden left office in January 2025'],
            'Joe Biden was US President 2021-2025. Donald Trump won the 2024 election and became president in January 2025. Biden is not the current president.',
            ['Visit whitehouse.gov for current administration info.'])

    # Trump as current president → REAL
    if 'trump' in c and ('current president' in c or 'president of' in c or 'president' in c) and 'dead' not in c:
        return _make_result('REAL', 97, 'HIGH', 'Politics',
            [claim], [],
            'Donald Trump won the 2024 US presidential election and was inaugurated in January 2025. He is the current US President.',
            ['Visit whitehouse.gov to confirm.'])

    # AI is dead → FAKE
    if 'ai is dead' in c or 'artificial intelligence is dead' in c:
        return _make_result('FAKE', 2, 'HIGH', 'Technology',
            [claim], ['AI is expanding rapidly'],
            'AI is not dead. The field is growing faster than ever with major advances in 2024-2025.',
            ['Follow AI news on Reuters or BBC Tech.'])

    return None


def analyze_text(content: str) -> dict:
    # Check rule-based classifier first
    quick = _rule_based_check(content)
    if quick:
        return quick

    fact_checks = _duckduckgo_fact_check(content[:200])
    signals = _check_signals(content)
    prompt = ANALYSIS_PROMPT.format(
        content=content[:4000],
        fact_checks=fact_checks,
        signals=signals,
    )
    return _parse_response(_chat(prompt))


def analyze_url(url: str) -> dict:
    title = ""
    body = ""
    fetch_error = None

    try:
        resp = http_requests.get(
            url, timeout=12,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
            tag.decompose()
        title = soup.title.string.strip() if soup.title else ""
        main = soup.find("article") or soup.find("main") or soup
        paragraphs = [
            p.get_text(" ", strip=True) for p in main.find_all("p")
            if len(p.get_text(strip=True)) > 40
        ]
        body = " ".join(paragraphs)[:3500] or soup.get_text(" ", strip=True)[:3500]
    except Exception as exc:
        fetch_error = str(exc)

    # Use article title for fact-check query (much more focused than raw content)
    fc_query = title or url
    fact_checks = _duckduckgo_fact_check(fc_query)

    if fetch_error:
        content = f"URL: {url}\n\nCould not fetch article: {fetch_error}"
    else:
        content = f"Title: {title}\nURL: {url}\n\nArticle:\n{body}"

    signals = _check_signals(content, url=url)
    prompt = ANALYSIS_PROMPT.format(
        content=content[:4000],
        fact_checks=fact_checks,
        signals=signals,
    )
    return _parse_response(_chat(prompt))


_easyocr_reader = None

def _ocr_extract(image_path: str) -> str:
    """Extract text from image using EasyOCR (accurate, no external binary needed)."""
    global _easyocr_reader
    try:
        import easyocr
        if _easyocr_reader is None:
            _easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        results = _easyocr_reader.readtext(image_path, detail=0, paragraph=True)
        return " ".join(results).strip()
    except Exception:
        return ""


def analyze_image(image_path: str) -> dict:
    # Step 1: try accurate OCR text extraction
    extracted_text = _ocr_extract(image_path)

    # Step 2: if OCR got text, run full pipeline (uses Groq if available)
    if extracted_text and len(extracted_text) > 10:
        fact_checks = _duckduckgo_fact_check(extracted_text[:200])
        signals = _check_signals(extracted_text)
        prompt = ANALYSIS_PROMPT.format(
            content=f"[Extracted from image] {extracted_text[:3000]}",
            fact_checks=fact_checks,
            signals=signals,
        )
        return _parse_response(_chat(prompt))

    # Step 3: fallback to llava vision model if OCR found nothing
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode("utf-8")
    return _parse_response(_chat(IMAGE_PROMPT, images=[image_b64]))
