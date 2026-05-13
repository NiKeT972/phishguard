# 🛡️ PhishGuard — India's AI-Powered Scam Shield

> **Hackathon:** KLEOS 4.0, RAIT ACM  
> **Team:** DATA MAVERICKS  
> **Track:** Cybersecurity / AI for Good

PhishGuard is a real-time, AI-powered scam and phishing detection platform built for India. It combines a fine-tuned BERT model (PhishBERT), Google Safe Browsing, VirusTotal, WHOIS lookups, and Indian-specific regex patterns to catch KYC fraud, OTP phishing, fake prize scams, and more — in seconds.

---

## 🎯 What It Does

| Feature | Description |
|---|---|
| **URL Scanner** | Checks links against Safe Browsing, VirusTotal, checks SSL, domain age, lookalike detection |
| **SMS / Email Scanner** | AI (BERT) + regex to detect bank impersonation, OTP phishing, KYC fraud, job scams |
| **UPI ID Checker** | Validates format, checks for known scam keywords in UPI IDs |
| **Chrome Extension** | Scans all links on every page, highlights suspicious ones with ⚠️/🚨 badges |
| **Dashboard** | Live scam heatmap of India, pie chart, recent scam feed |
| **Scam Encyclopedia** | Learn about 6 major scam types with real examples and what to do |
| **Hindi Explanations** | Scam reasons explained in Hindi for wider accessibility |

---

## 🏗️ Tech Stack

**Backend:** Python · FastAPI · HuggingFace Transformers (PhishBERT) · python-whois · httpx  
**Frontend:** React · Recharts · lucide-react · CSS Modules  
**Extension:** Chrome Extension Manifest V3 · Vanilla JS  
**AI Model:** `ealvaradob/bert-finetuned-phishing` from HuggingFace  
**APIs:** Google Safe Browsing · VirusTotal · WHOIS

---

## 🚀 Quick Start

### Option 1 — Automated (Recommended)

**Linux / Mac:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```cmd
start.bat
```

### Option 2 — Manual

#### Backend
```bash
cd backend
pip install -r requirements.txt
# Optional: add API keys to .env
uvicorn main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

---

## 🔑 API Keys (Optional — App Works Without Them)

The app works fully without API keys using the AI model + regex detection. Keys add extra accuracy.

### Google Safe Browsing (Free)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable "Safe Browsing API"
3. Create an API key
4. Add to `backend/.env`: `GOOGLE_SAFE_BROWSING_KEY=your_key_here`

### VirusTotal (Free — 4 requests/min)
1. Sign up at [VirusTotal](https://www.virustotal.com)
2. Go to Profile → API Key
3. Add to `backend/.env`: `VIRUSTOTAL_KEY=your_key_here`

---

## 🔌 Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder
5. The PhishGuard shield icon appears in your toolbar
6. Make sure the backend is running on port 8000

---

## 🧪 Demo Test Cases

Try these in the app for a perfect demo:

### Known SCAM URLs
```
http://sbi-kyc-update.com
http://paytm-reward.net
http://hdfc-account-verify.in
http://amazon-prize.tk
```

### Known SAFE URLs
```
https://sbi.co.in
https://paytm.com
https://amazon.in
https://google.com
```

### Scam SMS Messages
```
Dear customer your SBI account is blocked update KYC immediately click here: http://sbi-kyc.net

Congratulations! You have won Rs 50000 in KBC lottery. Call 9876543210 to claim

Your HDFC account will be suspended share OTP to verify
```

### Scam UPI IDs
```
pm-relief@upi
lottery@ybl
prize-winner@paytm
```

---

## 📡 API Reference

### `POST /api/scan/url`
```json
{ "url": "http://suspicious-link.tk" }
```
Returns: `verdict`, `confidence`, `reasons`, `domain_age_days`, `ssl_valid`, `virustotal_detections`

### `POST /api/scan/text`
```json
{ "text": "Your SBI KYC is pending...", "type": "sms" }
```
Returns: `verdict`, `confidence`, `scam_type`, `reasons_english`, `reasons_hindi`, `extracted_urls`

### `POST /api/scan/upi`
```json
{ "upi_id": "pm-relief@upi" }
```
Returns: `verdict`, `confidence`, `reasons`, `upi_format_valid`, `suspicious_keywords_found`

### `GET /api/stats`
Returns community stats, scam distribution, city heatmap data, recent scam feed.

---

## 🌐 Ports

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| Frontend App | http://localhost:3000 |
| API Docs | http://localhost:8000/docs |

---

## 📁 Project Structure

```
phishguard/
├── backend/
│   ├── main.py           # FastAPI app with all endpoints
│   ├── requirements.txt
│   └── .env              # API keys (optional)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Scanner.js    # Main scan page
│   │   │   ├── Dashboard.js  # Stats & heatmap
│   │   │   └── Learn.js      # Scam encyclopedia
│   │   ├── components/
│   │   │   ├── Layout.js     # Nav + wrapper
│   │   │   ├── VerdictCard.js # Result display
│   │   │   └── Toast.js      # Notifications
│   │   └── App.js
│   └── package.json
├── extension/
│   ├── manifest.json     # MV3 manifest
│   ├── popup.html/js/css # Extension popup
│   ├── background.js     # Service worker + context menus
│   ├── content.js        # Page link scanner
│   └── icons/
├── start.sh              # Linux/Mac startup script
├── start.bat             # Windows startup script
└── README.md
```

---

## 🤖 AI Model Details

**Model:** `ealvaradob/bert-finetuned-phishing`  
PhishBERT is a BERT model fine-tuned on phishing datasets. It classifies text as "phishing" or "legitimate" with high accuracy. PhishGuard combines this with 7 categories of Indian-specific regex patterns for comprehensive detection.

The model is downloaded automatically on first run and cached in memory. If download fails (no internet), the system gracefully falls back to regex-only detection.

---

## 🚨 Cyber Crime Reporting

If you've been scammed:
- **Report online:** [cybercrime.gov.in](https://cybercrime.gov.in)
- **Helpline:** 1930 (24×7)
- **Email:** complaints@cybercrime.gov.in

---

## 👥 Team DATA MAVERICKS

Built with ❤️ for KLEOS 4.0 Hackathon at RAIT ACM.

*"Every scam we catch protects one more Indian family."*
