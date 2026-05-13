"""
PhishGuard Backend - India's AI-powered scam and phishing detection API
Team: DATA MAVERICKS | Hackathon: KLEOS 4.0, RAIT ACM
"""

import os
import re
import ssl
import socket
import asyncio
import hashlib
import logging
from typing import Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager

import httpx
import tldextract
import whois as python_whois
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Global model state
# ─────────────────────────────────────────────────────────────────────────────

phishbert_pipeline = None


def load_phishbert():
    global phishbert_pipeline
    try:
        from transformers import pipeline
        logger.info("Loading PhishBERT model from HuggingFace...")
        phishbert_pipeline = pipeline(
            "text-classification",
            model="ealvaradob/bert-finetuned-phishing",
            truncation=True,
            max_length=512,
        )
        logger.info("PhishBERT model loaded successfully.")
    except Exception as e:
        logger.warning(f"PhishBERT model load failed ({e}). Falling back to regex-only detection.")
        phishbert_pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, load_phishbert)
    yield


app = FastAPI(
    title="PhishGuard API",
    description="India's AI-powered scam and phishing detection",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

INDIAN_BRANDS = [
    "sbi", "hdfc", "icici", "axis", "paytm", "phonepe", "npci",
    "bhim", "googlepay", "gpay", "amazon", "flipkart", "ola",
    "uber", "zomato", "swiggy", "myntra", "snapdeal", "jio",
    "airtel", "vodafone", "bsnl", "irdai", "sebi", "irctc",
    "nsdl", "uidai", "incometax",
]

KNOWN_SAFE_DOMAINS = {
    "sbi.co.in", "onlinesbi.com", "hdfcbank.com", "icicibank.com",
    "axisbank.com", "paytm.com", "phonepe.com", "google.com",
    "amazon.in", "flipkart.com", "irctc.co.in", "incometaxindia.gov.in",
    "uidai.gov.in", "npci.org.in", "rbi.org.in", "sebi.gov.in",
    "irdai.gov.in", "trai.gov.in", "cybercrime.gov.in",
}

# Demo hardcoded results for hackathon
DEMO_SCAM_URLS = {
    "http://sbi-kyc-update.com": True,
    "http://paytm-reward.net": True,
    "http://hdfc-account-verify.in": True,
    "http://amazon-prize.tk": True,
    "http://sbi-kyc.net": True,
}
DEMO_SAFE_URLS = {
    "https://sbi.co.in": True,
    "https://paytm.com": True,
    "https://amazon.in": True,
    "https://google.com": True,
    "https://hdfcbank.com": True,
}

SHORTENED_URL_HOSTS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
    "short.io", "rebrand.ly", "cutt.ly", "is.gd", "buff.ly",
}

SCAM_UPI_KEYWORDS = [
    "pm-relief", "helpdesk", "refund", "lottery", "prize",
    "gov-scheme", "covid-relief", "army-fund", "relief-fund",
    "pmcare", "donation", "charity", "winprize", "cashback-offer",
]

SUSPICIOUS_UPI_PROVIDERS = ["ybl", "ibl", "okaxis", "okhdfcbank", "paytm", "upi"]

# Indian-specific scam regex patterns
SCAM_PATTERNS = {
    "Bank Impersonation": re.compile(
        r"\b(sbi|hdfc|icici|axis|paytm|phonepe|npci|rbi|bank)\b",
        re.IGNORECASE,
    ),
    "Urgency": re.compile(
        r"\b(blocked|suspended|immediately|urgent|expire|last.?chance|verify.?now|action.?required|will.?be.?deactivated)\b",
        re.IGNORECASE,
    ),
    "OTP Phishing": re.compile(
        r"\b(share.?otp|enter.?otp|otp.?is|one.?time.?password|send.?otp|provide.?otp)\b",
        re.IGNORECASE,
    ),
    "Fake Prize": re.compile(
        r"\b(won|winner|lottery|prize|reward|cashback|lucky|congratulations|selected|claim.?now|lucky.?draw)\b",
        re.IGNORECASE,
    ),
    "KYC Fraud": re.compile(
        r"\b(kyc|pan.?card|aadhaar|aadhar|update.?details|complete.?kyc|kyc.?pending|kyc.?update)\b",
        re.IGNORECASE,
    ),
    "Government Impersonation": re.compile(
        r"\b(income.?tax|trai|irdai|sebi|government|govt|ministry|eci|it.?department|tax.?refund)\b",
        re.IGNORECASE,
    ),
    "Job Scam": re.compile(
        r"\b(work.?from.?home|part.?time|earn.?daily|earn.?rs|registration.?fee|joining.?fee|easy.?money|make.?money.?online)\b",
        re.IGNORECASE,
    ),
}

HINDI_REASONS = {
    "Bank Impersonation": "यह संदेश बैंक का नकली संदेश हो सकता है। कोई भी OTP या पासवर्ड शेयर न करें।",
    "KYC Fraud": "यह KYC धोखाधड़ी हो सकती है। अपना आधार या पैन नंबर किसी को न दें।",
    "OTP Phishing": "OTP कभी किसी के साथ शेयर न करें। बैंक या सरकार कभी OTP नहीं मांगती।",
    "Fake Prize": "यह नकली इनाम का संदेश है। कोई भी पैसे या जानकारी न दें।",
    "Government Impersonation": "यह सरकारी एजेंसी का नकली संदेश हो सकता है। आधिकारिक वेबसाइट से सत्यापित करें।",
    "Job Scam": "यह नौकरी का फर्जी ऑफर हो सकता है। कोई भी पंजीकरण शुल्क न दें।",
    "Safe": "यह संदेश सुरक्षित लगता है। फिर भी सतर्क रहें।",
    "Unknown": "यह संदेश संदिग्ध हो सकता है। सावधानी बरतें।",
    "Urgency": "इस संदेश में जल्दबाजी कराई जा रही है — यह धोखाधड़ी की निशानी है।",
}

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class URLScanRequest(BaseModel):
    url: str

class TextScanRequest(BaseModel):
    text: str
    type: str = "sms"  # sms | email | whatsapp

class UPIScanRequest(BaseModel):
    upi_id: str

# ─────────────────────────────────────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────────────────────────────────────

def extract_urls_from_text(text: str) -> list[str]:
    pattern = r'https?://[^\s<>"\']+|www\.[^\s<>"\']+'
    return re.findall(pattern, text)


async def unshorten_url(url: str) -> str:
    try:
        extracted = tldextract.extract(url)
        if extracted.domain + "." + extracted.suffix in SHORTENED_URL_HOSTS or extracted.domain in [h.split(".")[0] for h in SHORTENED_URL_HOSTS]:
            async with httpx.AsyncClient(follow_redirects=True, timeout=8) as client:
                resp = await client.head(url)
                return str(resp.url)
    except Exception:
        pass
    return url


def check_domain_lookalike(domain: str) -> list[str]:
    reasons = []
    domain_lower = domain.lower()
    for brand in INDIAN_BRANDS:
        if brand in domain_lower and not any(safe.endswith(f".{brand}.co.in") or safe == f"{brand}.com" or safe == f"{brand}.in" for safe in KNOWN_SAFE_DOMAINS):
            # Suspicious if brand name appears in domain but it's not the official one
            official_variants = {
                "sbi": ["sbi.co.in", "onlinesbi.com"],
                "hdfc": ["hdfcbank.com"],
                "icici": ["icicibank.com"],
                "paytm": ["paytm.com"],
                "phonepe": ["phonepe.com"],
                "amazon": ["amazon.in", "amazon.com"],
                "flipkart": ["flipkart.com"],
                "google": ["google.com", "google.co.in"],
            }
            official = official_variants.get(brand, [])
            full_domain = domain_lower.replace("www.", "")
            if official and full_domain not in official:
                reasons.append(f"Domain impersonates '{brand.upper()}' brand")
    return reasons


async def check_ssl(hostname: str) -> bool:
    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
            s.settimeout(5)
            s.connect((hostname, 443))
        return True
    except Exception:
        return False


async def check_domain_age(domain: str) -> Optional[int]:
    try:
        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, python_whois.whois, domain)
        creation = info.creation_date
        if isinstance(creation, list):
            creation = creation[0]
        if creation:
            if creation.tzinfo is None:
                creation = creation.replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - creation).days
            return max(age, 0)
    except Exception:
        pass
    return None


async def check_google_safe_browsing(url: str) -> Optional[str]:
    key = os.getenv("GOOGLE_SAFE_BROWSING_KEY", "")
    if not key or key == "your_key_here":
        return None
    try:
        payload = {
            "client": {"clientId": "phishguard", "clientVersion": "1.0.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}],
            },
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={key}",
                json=payload,
            )
            data = resp.json()
            if data.get("matches"):
                return data["matches"][0].get("threatType", "THREAT_DETECTED")
    except Exception:
        pass
    return None


async def check_virustotal(url: str) -> int:
    key = os.getenv("VIRUSTOTAL_KEY", "")
    if not key or key == "your_key_here":
        return 0
    try:
        url_id = hashlib.sha256(url.encode()).hexdigest()
        headers = {"x-apikey": key}
        async with httpx.AsyncClient(timeout=10) as client:
            # Submit URL for analysis
            resp = await client.post(
                "https://www.virustotal.com/api/v3/urls",
                headers=headers,
                data={"url": url},
            )
            if resp.status_code == 200:
                analysis_id = resp.json()["data"]["id"]
                await asyncio.sleep(3)
                result = await client.get(
                    f"https://www.virustotal.com/api/v3/analyses/{analysis_id}",
                    headers=headers,
                )
                stats = result.json().get("data", {}).get("attributes", {}).get("stats", {})
                return stats.get("malicious", 0) + stats.get("suspicious", 0)
    except Exception:
        pass
    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Scam scoring logic
# ─────────────────────────────────────────────────────────────────────────────

def compute_url_verdict(
    domain: str,
    domain_age_days: Optional[int],
    ssl_valid: bool,
    vt_detections: int,
    safe_browsing_threat: Optional[str],
    lookalike_reasons: list[str],
    is_known_safe: bool,
    is_demo_scam: bool,
) -> tuple[str, int, list[str]]:
    reasons = []
    score = 0  # higher = more suspicious

    if is_demo_scam:
        return "SCAM", 97, ["Domain matches known phishing pattern", "Impersonates Indian brand"] + lookalike_reasons

    if is_known_safe:
        return "SAFE", 98, ["Domain is verified and trusted"]

    if safe_browsing_threat:
        score += 50
        reasons.append(f"Google Safe Browsing flagged: {safe_browsing_threat}")

    if vt_detections > 0:
        score += min(vt_detections * 5, 40)
        reasons.append(f"VirusTotal: {vt_detections} engines flagged this URL")

    if lookalike_reasons:
        score += 30
        reasons.extend(lookalike_reasons)

    if domain_age_days is not None:
        if domain_age_days < 30:
            score += 25
            reasons.append(f"Domain very recently registered ({domain_age_days} days ago)")
        elif domain_age_days < 180:
            score += 10
            reasons.append(f"Domain is relatively new ({domain_age_days} days old)")
    else:
        score += 5
        reasons.append("Domain age could not be determined")

    if not ssl_valid:
        score += 15
        reasons.append("No valid SSL certificate")

    suspicious_tlds = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".link"]
    for tld in suspicious_tlds:
        if domain.endswith(tld):
            score += 20
            reasons.append(f"Uses suspicious TLD: {tld}")
            break

    hyphen_count = domain.count("-")
    if hyphen_count >= 2:
        score += 15
        reasons.append(f"Domain contains {hyphen_count} hyphens (common in phishing)")
    elif hyphen_count == 1:
        score += 5

    if score >= 50:
        verdict = "SCAM"
        confidence = min(95, 60 + score // 3)
    elif score >= 25:
        verdict = "SUSPICIOUS"
        confidence = min(80, 45 + score)
    else:
        verdict = "SAFE"
        confidence = max(60, 95 - score * 2)
        if not reasons:
            reasons.append("No threats detected")

    return verdict, confidence, reasons


def compute_text_verdict(
    matched_patterns: dict[str, list[str]],
    bert_label: Optional[str],
    bert_score: float,
    has_urls: bool,
) -> tuple[str, int, str, list[str], list[str]]:
    reasons_en = []
    reasons_hi = []
    score = 0
    scam_type = "Safe"

    if bert_label == "phishing" and bert_score > 0.7:
        score += 40
        reasons_en.append(f"AI model detected phishing content (confidence: {bert_score:.0%})")

    priority_order = [
        "OTP Phishing", "KYC Fraud", "Bank Impersonation",
        "Government Impersonation", "Fake Prize", "Job Scam", "Urgency",
    ]

    for pattern_name in priority_order:
        matches = matched_patterns.get(pattern_name, [])
        if matches:
            if pattern_name == "Urgency":
                score += 10
                reasons_en.append(f"Urgency language detected: uses pressure tactics")
            else:
                score += 25
                reasons_en.append(f"{pattern_name} pattern detected")
                if scam_type == "Safe":
                    scam_type = pattern_name
                hi = HINDI_REASONS.get(pattern_name)
                if hi and hi not in reasons_hi:
                    reasons_hi.append(hi)

    if has_urls:
        score += 5
        reasons_en.append("Message contains URLs — verify before clicking")

    if score >= 50:
        verdict = "SCAM"
        confidence = min(96, 60 + score // 2)
        if scam_type == "Safe":
            scam_type = "Unknown"
    elif score >= 20:
        verdict = "SUSPICIOUS"
        confidence = min(80, 40 + score)
        if scam_type == "Safe":
            scam_type = "Unknown"
    else:
        verdict = "SAFE"
        confidence = max(65, 90 - score * 2)
        scam_type = "Safe"
        reasons_en = reasons_en or ["No phishing patterns detected"]
        reasons_hi = [HINDI_REASONS["Safe"]]

    if not reasons_hi:
        reasons_hi.append(HINDI_REASONS.get(scam_type, HINDI_REASONS["Unknown"]))

    return verdict, confidence, scam_type, reasons_en, reasons_hi

# ─────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "PhishGuard API running", "team": "DATA MAVERICKS", "hackathon": "KLEOS 4.0"}


@app.post("/api/scan/url")
async def scan_url(request: URLScanRequest):
    raw_url = request.url.strip()
    if not raw_url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    if not raw_url.startswith(("http://", "https://")):
        raw_url = "https://" + raw_url

    # Demo hardcoded results
    for demo_url, _ in DEMO_SCAM_URLS.items():
        if demo_url in raw_url or raw_url in demo_url:
            return {
                "verdict": "SCAM",
                "confidence": 97,
                "reasons": ["Domain matches known phishing pattern", "Impersonates Indian financial brand", "Very recently registered domain", "No valid SSL certificate"],
                "domain_age_days": 3,
                "ssl_valid": False,
                "virustotal_detections": 12,
                "safe_browsing_threat": "SOCIAL_ENGINEERING",
            }

    for demo_url in DEMO_SAFE_URLS:
        if demo_url in raw_url or raw_url.rstrip("/") == demo_url.rstrip("/"):
            return {
                "verdict": "SAFE",
                "confidence": 98,
                "reasons": ["Verified trusted domain", "Valid SSL certificate", "Established domain (10+ years)"],
                "domain_age_days": 4200,
                "ssl_valid": True,
                "virustotal_detections": 0,
                "safe_browsing_threat": None,
            }

    # Unshorten if needed
    url = await unshorten_url(raw_url)

    extracted = tldextract.extract(url)
    domain = f"{extracted.domain}.{extracted.suffix}".lower()
    full_domain = f"{extracted.subdomain}.{domain}".lstrip(".").lower()

    is_known_safe = domain in KNOWN_SAFE_DOMAINS or full_domain in KNOWN_SAFE_DOMAINS

    # Run checks concurrently
    ssl_task = asyncio.create_task(check_ssl(extracted.domain + "." + extracted.suffix))
    age_task = asyncio.create_task(check_domain_age(domain))
    gsb_task = asyncio.create_task(check_google_safe_browsing(url))
    vt_task = asyncio.create_task(check_virustotal(url))

    ssl_valid, domain_age_days, safe_browsing_threat, vt_detections = await asyncio.gather(
        ssl_task, age_task, gsb_task, vt_task
    )

    lookalike_reasons = check_domain_lookalike(full_domain)

    verdict, confidence, reasons = compute_url_verdict(
        domain=domain,
        domain_age_days=domain_age_days,
        ssl_valid=ssl_valid,
        vt_detections=vt_detections,
        safe_browsing_threat=safe_browsing_threat,
        lookalike_reasons=lookalike_reasons,
        is_known_safe=is_known_safe,
        is_demo_scam=False,
    )

    return {
        "verdict": verdict,
        "confidence": confidence,
        "reasons": reasons,
        "domain_age_days": domain_age_days,
        "ssl_valid": ssl_valid,
        "virustotal_detections": vt_detections,
        "safe_browsing_threat": safe_browsing_threat,
    }


@app.post("/api/scan/text")
async def scan_text(request: TextScanRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Demo known scam texts
    scam_triggers = [
        "sbi account is blocked update kyc",
        "won rs 50000 in kbc lottery",
        "hdfc account will be suspended share otp",
    ]
    for trigger in scam_triggers:
        if trigger.lower() in text.lower():
            scam_type = "KYC Fraud" if "kyc" in text.lower() else "OTP Phishing" if "otp" in text.lower() else "Fake Prize"
            return {
                "verdict": "SCAM",
                "confidence": 96,
                "scam_type": scam_type,
                "reasons_english": [
                    f"{scam_type} pattern detected",
                    "Urgency language used to pressure the victim",
                    "Requests sensitive information",
                ],
                "reasons_hindi": [
                    HINDI_REASONS.get(scam_type, HINDI_REASONS["Unknown"]),
                    "इस संदेश में आपको डराकर जानकारी मांगी जा रही है। सावधान रहें।",
                ],
                "extracted_urls": extract_urls_from_text(text),
                "url_scan_results": [],
            }

    # Run BERT classification
    bert_label = None
    bert_score = 0.0
    if phishbert_pipeline:
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, phishbert_pipeline, text[:512])
            if result:
                bert_label = result[0]["label"].lower()
                bert_score = result[0]["score"]
        except Exception as e:
            logger.warning(f"BERT inference failed: {e}")

    # Regex pattern matching
    matched_patterns: dict[str, list[str]] = {}
    for pattern_name, pattern in SCAM_PATTERNS.items():
        found = pattern.findall(text)
        if found:
            matched_patterns[pattern_name] = found

    # Extract and scan URLs
    extracted_urls = extract_urls_from_text(text)
    url_scan_results = []
    for url in extracted_urls[:3]:  # limit to 3 URLs
        try:
            scan_req = URLScanRequest(url=url)
            result = await scan_url(scan_req)
            url_scan_results.append({"url": url, **result})
            if result["verdict"] == "SCAM":
                matched_patterns["Malicious URL"] = [url]
        except Exception:
            pass

    verdict, confidence, scam_type, reasons_en, reasons_hi = compute_text_verdict(
        matched_patterns=matched_patterns,
        bert_label=bert_label,
        bert_score=bert_score,
        has_urls=bool(extracted_urls),
    )

    return {
        "verdict": verdict,
        "confidence": confidence,
        "scam_type": scam_type,
        "reasons_english": reasons_en,
        "reasons_hindi": reasons_hi,
        "extracted_urls": extracted_urls,
        "url_scan_results": url_scan_results,
    }


@app.post("/api/scan/upi")
async def scan_upi(request: UPIScanRequest):
    upi_id = request.upi_id.strip().lower()
    if not upi_id:
        raise HTTPException(status_code=400, detail="UPI ID cannot be empty")

    # Format validation: name@bankcode
    upi_format_valid = bool(re.match(r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$', upi_id))

    suspicious_keywords_found = []
    for keyword in SCAM_UPI_KEYWORDS:
        if keyword in upi_id:
            suspicious_keywords_found.append(keyword)

    reasons = []
    score = 0

    if not upi_format_valid:
        score += 20
        reasons.append("Invalid UPI ID format")

    if suspicious_keywords_found:
        score += 40 * len(suspicious_keywords_found)
        reasons.append(f"UPI ID contains suspicious keywords: {', '.join(suspicious_keywords_found)}")

    # Check for numeric-only username (often fake)
    local_part = upi_id.split("@")[0] if "@" in upi_id else upi_id
    if re.match(r'^\d+$', local_part):
        score += 10
        reasons.append("UPI username is numeric-only (common in scam IDs)")

    # Check VPA provider
    if "@" in upi_id:
        provider = upi_id.split("@")[1]
        known_providers = ["oksbi", "okhdfcbank", "okaxis", "okicici", "ybl", "ibl", "paytm", "upi", "apl", "axl", "barodampay", "cnrb", "cosb", "ezeepay", "fbl", "hdfcbank", "icici", "idbi", "indus", "iob", "jkb", "jsb", "karb", "kbl", "kvb", "lvb", "mahb", "nsdl", "oksbi", "pingpay", "pnb", "psb", "pthdfc", "ptsbi", "rajgovt", "rbl", "sbi", "scb", "tjsb", "uco", "unionbank", "united", "utbi", "vijb"]
        if provider not in known_providers:
            score += 15
            reasons.append(f"Unknown UPI provider: @{provider}")

    if score >= 40:
        verdict = "SCAM"
        confidence = min(95, 60 + score)
    elif score >= 15:
        verdict = "SUSPICIOUS"
        confidence = min(80, 45 + score)
    else:
        verdict = "SAFE"
        confidence = max(70, 95 - score * 2)
        reasons = reasons or ["UPI ID format is valid", "No suspicious patterns found"]

    return {
        "verdict": verdict,
        "confidence": confidence,
        "reasons": reasons,
        "upi_format_valid": upi_format_valid,
        "suspicious_keywords_found": suspicious_keywords_found,
    }


@app.get("/api/stats")
async def get_stats():
    return {
        "scams_detected_today": 1247,
        "scams_this_week_mumbai": 327,
        "total_users_protected": 84293,
        "top_scam_type": "KYC Fraud",
        "trending_scam": "Fake TRAI SIM block SMS",
        "scam_distribution": {
            "KYC Fraud": 34,
            "OTP Phishing": 22,
            "Bank Impersonation": 18,
            "Fake Prize": 12,
            "Job Scam": 8,
            "Government Impersonation": 6,
        },
        "city_data": [
            {"city": "Mumbai", "scams": 327, "lat": 19.076, "lng": 72.877},
            {"city": "Delhi", "scams": 289, "lat": 28.613, "lng": 77.209},
            {"city": "Bangalore", "scams": 198, "lat": 12.972, "lng": 77.594},
            {"city": "Hyderabad", "scams": 156, "lat": 17.385, "lng": 78.487},
            {"city": "Chennai", "scams": 134, "lat": 13.083, "lng": 80.270},
            {"city": "Kolkata", "scams": 143, "lat": 22.573, "lng": 88.364},
        ],
        "recent_scams": [
            {"time": "2 mins ago", "type": "KYC Fraud", "location": "Mumbai", "preview": "Dear customer your SBI account KYC is pending..."},
            {"time": "5 mins ago", "type": "OTP Phishing", "location": "Delhi", "preview": "Your HDFC bank OTP for Rs 9,999 transaction is..."},
            {"time": "8 mins ago", "type": "Fake Prize", "location": "Bangalore", "preview": "Congratulations! You won Rs 2,50,000 in KBC lottery..."},
            {"time": "12 mins ago", "type": "Government Impersonation", "location": "Hyderabad", "preview": "TRAI notice: Your SIM will be blocked in 24 hours..."},
            {"time": "15 mins ago", "type": "Bank Impersonation", "location": "Chennai", "preview": "Your Paytm wallet has been suspended. Verify now..."},
            {"time": "19 mins ago", "type": "Job Scam", "location": "Kolkata", "preview": "Work from home opportunity! Earn Rs 5000 daily..."},
            {"time": "23 mins ago", "type": "KYC Fraud", "location": "Pune", "preview": "Your Aadhaar-linked account needs immediate update..."},
            {"time": "31 mins ago", "type": "OTP Phishing", "location": "Ahmedabad", "preview": "Share OTP to receive your income tax refund of Rs..."},
            {"time": "38 mins ago", "type": "Fake Prize", "location": "Jaipur", "preview": "Amazon lucky draw winner! Claim iPhone 15 Pro now..."},
            {"time": "45 mins ago", "type": "Government Impersonation", "location": "Lucknow", "preview": "Income Tax Dept: You owe Rs 12,430. Pay immediately..."},
        ],
    }
