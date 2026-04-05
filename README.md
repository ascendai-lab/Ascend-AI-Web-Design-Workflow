<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/GPT--5.4_Mini-OpenAI-412991?logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Brave_Search-API-FB542B?logo=brave&logoColor=white" alt="Brave" />
  <img src="https://img.shields.io/badge/Google_Drive-API-4285F4?logo=googledrive&logoColor=white" alt="Drive" />
  <img src="https://img.shields.io/badge/Slack-Bot-4A154B?logo=slack&logoColor=white" alt="Slack" />
  <img src="https://img.shields.io/badge/SQLite-Knowledge_Base-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
</p>

# 🚀 Ascend AI — Agentic Client Onboarding System

An autonomous, multi-agent Node.js system that transforms a client onboarding form into a complete research report and conversion-optimized website content — with built-in quality assurance, self-learning, and human-in-the-loop approval.

> **Built for web design agencies.** Triggered by a Tally form, powered by GPT-5.4 Mini, delivered via Google Docs, approved through Slack.

---

## ✨ What It Does

When a potential web design client fills out your Tally onboarding form, the system autonomously:

1. **🔬 Researches** the client's industry, audience, competitors, and existing website
2. **📊 Generates** a branded PDF research report with SWOT analysis and gap recommendations
3. **✍️ Writes** complete, conversion-optimized website content (Homepage, About, Services, Contact)
4. **🔎 Audits** the content against 8 quality checks — revising automatically until it passes
5. **🧠 Learns** from every successful piece of content to improve future output
6. **📄 Publishes** the final content to a Google Doc in the client's Drive folder
7. **💬 Notifies you** via Slack with interactive **Approve / Revise** buttons
8. **📧 Emails the client** a branded review link when you approve

**Zero manual work from form submission to client delivery.**

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        TALLY FORM                              │
│                    (27-field onboarding)                        │
└───────────────────────┬────────────────────────────────────────┘
                        │ POST /webhook/tally
                        ▼
┌────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER                              │
│               api.ascendaimarketing.cloud                      │
└───────────────────────┬────────────────────────────────────────┘
                        │
          ┌─────────────▼─────────────┐
          │    🔬 RESEARCH AGENT       │
          │    GPT-5.4 Mini + Tools    │
          │                            │
          │  ┌─ 🔍 Brave Search        │
          │  ├─ 🌐 Website Scraper     │
          │  ├─ 📊 PageSpeed Audit     │
          │  └─ 🏢 Competitor Finder   │
          │                            │
          │  → SWOT Analysis           │
          │  → Gap Analysis            │
          │  → PDF Report              │
          └─────────────┬──────────────┘
                        │
                  Upload to Drive
                  Slack: "Research ready"
                        │
          ┌─────────────▼──────────────┐
          │    ✍️ CONTENT WRITER        │
          │    GPT-5.4 Mini + Tools     │
          │                             │
          │  ┌─ 🔍 Brave Search         │
          │  └─ 🧠 Knowledge Base       │
          │                             │
          │  → Full website Markdown    │
          └─────────────┬───────────────┘
                        │
          ┌─────────────▼───────────────┐
          │    🔎 CONTENT AUDITOR        │
          │    8-Point Quality Gate      │
          │                              │
          │  1. SEO Optimization         │
          │  2. No Fluff                 │
          │  3. Conversion Focus         │
          │  4. Helpfulness & Authority  │
          │  5. Readability              │
          │  6. Brand Voice Alignment    │
          │  7. Completeness             │
          │  8. Unique Value             │
          │                              │
          │  FAIL? → Feedback → Writer   │
          │  PASS? → Continue ✅         │
          └─────────────┬────────────────┘
                        │
                  ┌─────▼──────┐
                  │ 🧠 LEARN    │  Save to Knowledge Base
                  └─────┬──────┘
                        │
                  Create Google Doc
                  Upload to Drive
                        │
          ┌─────────────▼────────────────┐
          │    💬 SLACK APPROVAL           │
          │                                │
          │  [✅ Approve]  [❌ Revise]     │
          │                                │
          │  Approve → 📧 Email client     │
          │  Revise  → Feedback → Rewrite  │
          └────────────────────────────────┘
```

---

## 📁 Project Structure

```
ascend-ai-web-design-workflows/
├── package.json
├── .env.example                 # All required env vars documented
├── ecosystem.config.js          # PM2 production config
│
├── src/
│   ├── index.js                 # Express server entry
│   ├── config.js                # Env validation (fails fast)
│   │
│   ├── agents/
│   │   ├── researchAgent.js     # 🔬 Autonomous research (4 tools)
│   │   ├── contentAgent.js      # ✍️ Conversion copywriter (2 tools)
│   │   └── auditAgent.js        # 🔎 8-point quality gate
│   │
│   ├── tools/
│   │   ├── braveSearch.js       # Brave Search API
│   │   ├── websiteScraper.js    # Cheerio-based page extraction
│   │   ├── siteAudit.js         # Google PageSpeed Insights
│   │   └── competitorFinder.js  # Multi-query competitor discovery
│   │
│   ├── services/
│   │   ├── knowledgeBase.js     # SQLite self-learning store
│   │   ├── googleDrive.js       # Auto-create client folders
│   │   ├── googleDocs.js        # Markdown → Google Doc
│   │   ├── slack.js             # Block Kit + interactive buttons
│   │   ├── email.js             # Gmail SMTP delivery
│   │   └── reportGenerator.js   # Research → branded PDF
│   │
│   ├── pipeline/
│   │   ├── orchestrator.js      # End-to-end pipeline coordinator
│   │   └── auditLoop.js         # Write → Audit → Revise loop
│   │
│   ├── routes/
│   │   ├── webhook.js           # POST /webhook/tally
│   │   └── slackInteractions.js # Approve/Revise handlers
│   │
│   ├── db/
│   │   └── schema.sql           # SQLite schema (3 tables)
│   │
│   └── utils/
│       ├── logger.js            # Pino structured logging
│       └── formParser.js        # Maps 27 Tally fields → clean keys
│
├── templates/
│   └── email.html               # Branded client email
│
├── scripts/
│   └── test-webhook.js          # Mock Tally payload for testing
│
└── data/
    └── knowledge.db             # SQLite database (auto-created)
```

---

## 🔎 The 8-Point Content Audit

Every piece of content must pass **all 8 checks** (score ≥ 7/10 each) before reaching a client:

| # | Check | What It Catches |
|---|-------|-----------------|
| 1 | **SEO Optimization** | Missing keywords, bad meta tags, no LSI terms |
| 2 | **No Fluff** | Filler phrases, redundancy, vague claims, passive voice |
| 3 | **Conversion Focus** | Missing CTAs, features-over-benefits, no objection handling |
| 4 | **Helpfulness & Authority** | Generic advice, no data points, no actionable info |
| 5 | **Readability** | Long paragraphs, high grade level, wall-of-text |
| 6 | **Brand Voice** | Tone inconsistency, wrong audience language |
| 7 | **Completeness** | Missing pages, placeholder text, no meta descriptions |
| 8 | **Unique Value** | Generic copy, no differentiation, SWOT not leveraged |

Failed content gets **specific, actionable feedback** and is automatically revised (up to 3 attempts).

---

## 🧠 Self-Learning Knowledge Base

The system improves over time by storing:

- ✅ **Successful content** — what passed, why it passed, audit scores
- ❌ **Failure patterns** — what failed, the feedback given, which checks broke
- 📊 **Pipeline history** — every run tracked for debugging

Before writing new content, the **Content Writer agent queries the knowledge base** for:
- Top-performing examples in the same industry
- Common failure patterns to avoid

The more clients you run, the better the first-attempt pass rate becomes.

---

## ⚡ Quick Start

### Prerequisites

- Node.js 20+
- API keys: OpenAI, Brave Search, Google Cloud, Slack, Gmail

### 1. Clone & Install

```bash
git clone https://github.com/ascendai-lab/Ascend-AI-Web-Design-Workflow.git
cd Ascend-AI-Web-Design-Workflow
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run Locally

```bash
npm run dev
```

### 4. Test with Mock Data

```bash
npm run test:webhook
```

---

## 🔑 Required API Keys

| Service | Where to Get It | Used For |
|---------|----------------|----------|
| **OpenAI** | [platform.openai.com](https://platform.openai.com/api-keys) | GPT-5.4 Mini — all 3 agents |
| **Brave Search** | [brave.com/search/api](https://brave.com/search/api/) | Web research + competitor discovery |
| **Google Cloud** | [console.cloud.google.com](https://console.cloud.google.com/) | Drive folders + Docs creation (Service Account) |
| **Slack** | [api.slack.com/apps](https://api.slack.com/apps) | Notifications + interactive approval |
| **Gmail** | [App Passwords](https://myaccount.google.com/apppasswords) | Client email delivery |

---

## 🚀 Production Deployment (Ubuntu VPS)

### 1. DNS

Add an A record pointing your subdomain to your VPS IP:

```
Type: A    Name: api    Value: YOUR_VPS_IP    TTL: 3600
```

### 2. Server Setup

```bash
ssh root@YOUR_VPS_IP

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Deploy
cd /opt
git clone https://github.com/ascendai-lab/Ascend-AI-Web-Design-Workflow.git ascend-ai
cd ascend-ai
npm install
cp .env.example .env
nano .env  # Fill in API keys
```

### 3. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ascend-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 4. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Configure Webhooks

- **Tally:** Form Settings → Integrations → Webhook → `https://api.yourdomain.com/webhook/tally`
- **Slack:** App Settings → Interactivity → Request URL → `https://api.yourdomain.com/slack/interactions`

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Service info + available endpoints |
| `GET` | `/webhook/health` | Health check |
| `POST` | `/webhook/tally` | Tally form webhook (triggers pipeline) |
| `POST` | `/slack/interactions` | Slack button/modal handler |

---

## 🔧 Environment Variables

See [`.env.example`](.env.example) for the complete list with documentation.

Key variables:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model name (default: `gpt-5.4-mini`) |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | ID of your "Clients" folder in Drive |
| `SLACK_BOT_TOKEN` | Slack bot OAuth token |
| `SLACK_CHANNEL_ID` | Channel to send notifications |
| `MAX_AUDIT_ATTEMPTS` | Max write→audit→revise cycles (default: 3) |
| `AUDIT_PASS_THRESHOLD` | Minimum score per check (default: 7) |

---

## 📄 License

This project is proprietary software built for Ascend AI Marketing.

---

<p align="center">
  <strong>Built by <a href="https://ascendaimarketing.cloud">Ascend AI Marketing</a></strong><br>
  <em>Powered by AI, guided by strategy.</em>
</p>
