# TrainingSurvey — Design Specification

**Date:** 2026-05-19
**Status:** Approved
**Project location:** `F:\Projects\Cloned\08_OtherProjects\TrainingSurvey\`

---

## 1. Purpose

Internal Arabic-language survey for evaluating the DocsysFrontend training program delivered to Saudi/Wilayah employees. Mixed online + onsite sessions, mixed and diverse content covering: Docsys core (records, treatments, attachments lifecycle), system search (Quick + Advanced), Statistics dashboard, and SettingManagement.

The survey is filled by trainees (no login), submissions are stored centrally, and a single admin can view aggregated analytics + export raw data.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Static frontend (Netlify CDN)               │
│  /                → name+email gate → survey             │
│  /thanks          → submission confirmation              │
│  /admin           → password gate → bento dashboard      │
│  /admin/report    → print-friendly view (PDF-ready)      │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch()
                       ▼
┌─────────────────────────────────────────────────────────┐
│               Netlify Functions (Node.js)                │
│  POST /api/submit                                        │
│  POST /api/admin/login    POST /api/admin/logout         │
│  GET  /api/admin/stats    GET  /api/admin/responses      │
│  GET  /api/admin/export                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Netlify Blobs                         │
│  Bucket: responses/      (one blob per submission)       │
│  Bucket: email_index/    (sha256(email) → metadata)      │
└─────────────────────────────────────────────────────────┘
```

### Constraints

- **Frontend:** Pure HTML/CSS/JS — no React/Vue/Angular, no CDNs, no framework runtime
- **Backend:** Node.js stdlib + ONE permitted dependency: `@netlify/blobs`
- **No external services:** Everything runs on Netlify infrastructure
- **Hosting:** Netlify free tier (auto-deploy from GitHub on push)

---

## 3. Data Model

### 3.1 `public/questions.json` — survey schema

Stable IDs decouple data from wording. Edit this file to add/edit/remove questions; redeploy applies changes.

```json
{
  "version": 1,
  "title": "استبيان تقييم البرنامج التدريبي على نظام Docsys",
  "subtitle": "نشكر تعاونكم في تطوير برامجنا التدريبية",
  "sections": [
    {
      "id": "trainer",
      "title": "تقييم المدرّب",
      "questions": [
        { "id": "trainer_clarity",        "type": "stars",    "label": "كيف تقيّمون وضوح المدرّب في عرض المحتوى التدريبي؟", "required": true },
        { "id": "trainer_mastery",        "type": "stars",    "label": "كيف تقيّمون مدى إلمام المدرّب بمحتوى نظام Docsys ومكوّناته؟", "required": true },
        { "id": "trainer_engagement",     "type": "stars",    "label": "كيف تقيّمون تفاعل المدرّب مع المتدربين وحرصه على إشراكهم؟", "required": true },
        { "id": "trainer_time_mgmt",      "type": "stars",    "label": "كيف تقيّمون التزام المدرّب بالوقت وحُسن إدارة الجلسة؟", "required": true },
        { "id": "trainer_responsiveness", "type": "likert",   "label": "استجاب المدرّب لاستفساراتنا بشكل وافٍ ومناسب.", "required": true }
      ]
    },
    {
      "id": "online_sessions",
      "title": "الجلسات التدريبية الإلكترونية",
      "questions": [
        { "id": "online_platform",        "type": "stars", "label": "جودة المنصة الإلكترونية المستخدمة في التدريب", "required": true },
        { "id": "online_av_quality",      "type": "stars", "label": "وضوح الصوت والصورة خلال الجلسات الإلكترونية", "required": true },
        { "id": "online_access_review",   "type": "stars", "label": "سهولة الوصول إلى المحتوى وإمكانية مراجعته لاحقاً", "required": true },
        { "id": "online_duration",        "type": "stars", "label": "ملاءمة مدة الجلسات الإلكترونية وعددها", "required": true }
      ]
    },
    {
      "id": "onsite_sessions",
      "title": "الجلسات التدريبية الحضورية",
      "questions": [
        { "id": "onsite_venue",           "type": "stars", "label": "كيف تقيّمون ملاءمة قاعات التدريب في مكاتب الولاية لانعقاد الجلسات الحضورية؟", "required": true },
        { "id": "onsite_organization",    "type": "stars", "label": "تنظيم الجلسات الحضورية وانضباطها", "required": true },
        { "id": "onsite_practical_time",  "type": "stars", "label": "كفاية الوقت المخصص للتطبيق العملي", "required": true },
        { "id": "onsite_discussion",      "type": "stars", "label": "توفّر فرص النقاش والمشاركة بين الحضور", "required": true }
      ]
    },
    {
      "id": "system_understanding",
      "title": "فهم النظام ومكوّناته",
      "questions": [
        { "id": "sys_treatment_stages",   "type": "stars",  "label": "مدى فهمكم لمراحل دورة المعاملات في النظام (الإدراج الأولي، الفهرسة، التدقيق والمراجعة، التصحيح)", "required": true },
        { "id": "sys_records_mgmt",       "type": "stars",  "label": "قدرتكم على إدارة السجلات والوثائق والمرفقات داخل النظام", "required": true },
        { "id": "sys_search",             "type": "stars",  "label": "قدرتكم على البحث في النظام (السريع والمتقدّم)", "required": true },
        { "id": "sys_statistics",         "type": "stars",  "label": "قدرتكم على قراءة لوحة الإحصاءات وفهم مؤشراتها", "required": true },
        { "id": "sys_settings",           "type": "stars",  "label": "قدرتكم على إدارة إعدادات النظام (SettingManagement)", "required": true },
        { "id": "sys_confidence",         "type": "likert", "label": "أصبحت أكثر ثقة في استخدام النظام بعد إتمامي هذا التدريب.", "required": true },
        { "id": "sys_help_colleagues",    "type": "likert", "label": "بإمكاني — عند الحاجة — توجيه زملائي ومساعدتهم في استخدام النظام.", "required": true }
      ]
    },
    {
      "id": "content_materials",
      "title": "المحتوى والمواد",
      "questions": [
        { "id": "content_relevance",      "type": "stars", "label": "ملاءمة المحتوى التدريبي لطبيعة عملكم اليومي", "required": true },
        { "id": "content_quality",        "type": "stars", "label": "جودة المواد التدريبية والشروحات المقدّمة", "required": true },
        { "id": "content_balance",        "type": "stars", "label": "توازن المحتوى بين الجانب النظري والتطبيق العملي", "required": true }
      ]
    },
    {
      "id": "overall",
      "title": "التقييم العام والتوصية",
      "questions": [
        { "id": "overall_program",        "type": "stars", "label": "البرنامج التدريبي بشكل عام", "required": true },
        { "id": "overall_goals",          "type": "stars", "label": "مدى تحقيق التدريب لأهدافكم الوظيفية", "required": true },
        { "id": "overall_nps",            "type": "nps",   "label": "ما مدى استعدادكم لترشيح هذا التدريب لزملائكم؟ (٠ = إطلاقاً، ١٠ = بشدة)", "required": true }
      ]
    },
    {
      "id": "feedback",
      "title": "ملاحظاتكم واقتراحاتكم",
      "questions": [
        { "id": "fb_positives",           "type": "textarea", "label": "ما أبرز الجوانب الإيجابية التي لاحظتموها في البرنامج التدريبي؟",       "required": true,  "maxLength": 2000 },
        { "id": "fb_improvements",        "type": "textarea", "label": "ما الجوانب التي ترون أنها تحتاج إلى تطوير في تجربتكم التدريبية؟",      "required": true,  "maxLength": 2000 },
        { "id": "fb_future_suggestions",  "type": "textarea", "label": "ما اقتراحاتكم لتحسين البرامج التدريبية القادمة على نظام Docsys؟",        "required": false, "maxLength": 2000 },
        { "id": "fb_trainer_notes",       "type": "textarea", "label": "هل لديكم ملاحظات تودّون مشاركتها حول أداء المدرّب بشكل خاص؟",         "required": false, "maxLength": 2000 }
      ]
    }
  ]
}
```

### 3.2 Response blob

Stored in Netlify Blobs bucket `responses`, key = `{ISO timestamp}-{uuid-short}`:

```json
{
  "responseId": "01J9X4M3K7P8Q-a3f5",
  "submittedAt": "2026-05-20T10:34:21.000Z",
  "respondent": {
    "name": "محمد أحمد",
    "email": "m.ahmed@wilayah.example.gov.sa"
  },
  "isDuplicate": false,
  "submissionCountForEmail": 1,
  "userAgent": "Mozilla/5.0 ...",
  "questionsVersion": 1,
  "answers": {
    "trainer_clarity":        5,
    "trainer_responsiveness": "agree",
    "overall_nps":            9,
    "fb_positives":           "كان البرنامج مفيداً ومنظماً...",
    "fb_trainer_notes":       null
  }
}
```

**Value types:**
- `stars` → integer 1–5
- `likert` → `"strongly_disagree" | "disagree" | "neutral" | "agree" | "strongly_agree"`
- `nps` → integer 0–10
- `textarea` → string (HTML-stripped server-side; null if optional and empty)

### 3.3 Email index blob

Bucket `email_index`, key = `sha256(lowercase(email))`:

```json
{
  "emailHash": "abc123...",
  "firstSubmittedAt": "2026-05-20T10:34:21.000Z",
  "submissionCount": 2,
  "responseIds": ["01J9X4M3K7P8Q-a3f5", "01J9X5N2L8R9S-b6c4"]
}
```

Email stored hashed-only here for privacy. Full email lives only inside response blobs (admin-readable on export).

### 3.4 Admin session cookie

Self-contained, no server-side session store:

```
admin_session = base64url(payload) + "." + HMAC-SHA256(payload, ADMIN_SESSION_SECRET)

payload = { "u": "Admin", "iat": <unix>, "exp": <unix + 4h> }

Flags: HttpOnly; Secure; SameSite=Strict; Path=/
```

Verified on every protected endpoint with `crypto.timingSafeEqual()`.

---

## 4. API Contract

| Method | Endpoint | Auth | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/api/submit` | none | `{ name, email, answers, confirmDuplicate? }` | `{ responseId, isDuplicate, requiresConfirmation? }` |
| POST | `/api/admin/login` | none | `{ username, password }` | 200 with cookie / 401 / 429 |
| POST | `/api/admin/logout` | cookie | — | 204, cookie cleared |
| GET | `/api/admin/stats` | cookie | `?from=ISO&to=ISO&includeDuplicates=bool` | Aggregated stats payload |
| GET | `/api/admin/responses` | cookie | `?from=&to=&includeDuplicates=` | Respondents list (no per-respondent answers in response — privacy) |
| GET | `/api/admin/export?format=json\|csv` | cookie | `?from=&to=&includeDuplicates=` | File download |

### 4.1 Aggregated stats payload (shape)

```json
{
  "filters": { "from": "...", "to": "...", "includeDuplicates": false },
  "kpis": {
    "totalResponses": 87,
    "uniqueRespondents": 72,
    "overallSatisfactionAvg": 4.2,
    "npsScore": 45,
    "completionRate": 0.86
  },
  "categoryAverages": [
    { "id": "trainer",              "avg": 4.3, "count": 87 },
    { "id": "online_sessions",      "avg": 3.9, "count": 87 }
  ],
  "perQuestion": [
    {
      "id": "trainer_clarity",
      "type": "stars",
      "label": "...",
      "avg": 4.7,
      "count": 87,
      "distribution": { "1": 0, "2": 1, "3": 5, "4": 19, "5": 62 }
    },
    {
      "id": "trainer_responsiveness",
      "type": "likert",
      "distribution": { "strongly_disagree": 1, "disagree": 3, "neutral": 8, "agree": 35, "strongly_agree": 40 }
    },
    {
      "id": "overall_nps",
      "type": "nps",
      "distribution": { "0": 1, "1": 0, "...": "...", "10": 28 },
      "promoters": 56, "passives": 22, "detractors": 9
    }
  ],
  "topRated": [ { "id": "...", "avg": 4.7 }, ... 3 ],
  "bottomRated": [ { "id": "...", "avg": 2.9 }, ... 3 ],
  "textResponses": [
    { "id": "fb_positives", "responses": [{ "responseId": "...", "text": "..." }] }
  ],
  "wordCloud": [ { "word": "المحتوى", "count": 34 } ],
  "timeTrend": [ { "date": "2026-05-20", "count": 14 } ]
}
```

---

## 5. UX Flows

### 5.1 Survey-taker

1. **Land `/`** — Wilayah branded gate. Name (required), email (required, regex-validated), estimated time, privacy note, "بدء الاستبيان" button.
2. **Survey** — All 30 items on one page (no collapsing — single scroll), grouped under 7 visual section headers, sticky progress bar at top showing X/30 filled. Required fields marked. Auto-save draft to localStorage every 3s.
3. **Submit** — Button disabled until all required filled. POST `/api/submit`. Server hashes email, checks index, stores response.
4. **Duplicate flow** — If email already exists, server responds `{ requiresConfirmation: true, isDuplicate: true }`. Client shows soft modal; on confirm, retries with `confirmDuplicate: true`. Response stored, flagged.
5. **`/thanks`** — Confirmation screen. localStorage draft cleared.

### 5.2 Admin

1. **`/admin`** — Check cookie. Valid → dashboard. Else → `/admin-login`.
2. **`/admin-login`** — Username + password. Rate-limited (5 fail / 5min per IP → 429 for 10 min). On success, HMAC cookie set, redirect to dashboard.
3. **Dashboard** — Bento glassmorphism. 7 rows: KPI strip → Best/Worst insights → category averages → per-question breakdown (collapsible) → Likert distribution → qualitative (word cloud + text list) → time trend + respondents list → footer actions.
4. **Filters** — Date range dropdown, include-duplicates toggle. All charts recompute client-side from stats payload (single API call refresh).
5. **Export** — JSON or CSV. CSV: UTF-8 with BOM, CRLF, RFC 4180 quoting, Likert values exported as both string AND numeric (`agree` + `4`).
6. **Print report** — `/admin/report?from=&to=` — `@media print` CSS, ready for browser PDF print.
7. **Logout** — Cookie cleared with Max-Age=0.

---

## 6. Visual Design

### 6.1 Palette

**Survey (Wilayah light):**
- Primary green: `#019443`
- Secondary gold: `#E9B90F`
- Tertiary grey: `#A3A3A3`
- Background: `#ffffff`
- Star fill: `#E9B90F`, star empty: rgba(0,0,0,0.15)
- Selected/success: `#c8e6c9` (Wilayah datagrid selected-row green)

**Admin (Glassmorphism bento — dark base):**
- Base: `#0a0e14`
- Tile: `#161b22` with `border: 1px solid #21262d`
- Glass effect: `backdrop-filter: blur(10px) saturate(140%)` on accent tiles
- Accent green tile: gradient `rgba(1,148,67,0.12) → #161b22` + `border-color: rgba(1,148,67,0.4)`
- Accent gold tile: gradient `rgba(233,185,15,0.12) → #161b22` + `border-color: rgba(233,185,15,0.4)`
- Text: `#fff` headings, `#7d8590` labels, `#8b949e` sub-text
- Green metric values: `#4ade80`; Gold: `#facc15`

### 6.2 Typography

- **Font:** DINNext (self-hosted from `public/fonts/DINNext/`, copied from `DocsysFrontend/wwwroot/fonts/ThemeNew/DINNEXT/`).
- **Sizes:** Survey body 16px, headings 20px, question labels 16px. Admin: KPI numbers 32–40px, labels 11px uppercase, body 14px.
- **Numerals:** Arabic-Indic (`٠١٢٣٤٥٦٧٨٩`) in survey UI. ASCII (`0–9`) in admin dashboard (better for tabular numeric data).

### 6.3 Layout primitives

- **Survey:** Single `<main>` column max-width 720px, centered, 24px padding. Sticky header `position: sticky; top: 0`. RTL via `<html dir="rtl">`.
- **Admin:** CSS grid `grid-template-columns: repeat(12, 1fr)`. Tiles span 3/4/6/12 columns depending on row. Mobile: stack into single column below 768px.

### 6.4 Charts (vanilla SVG, no library)

- **KPI tiles:** plain HTML, one-shot count-up animation on first load (no loop).
- **Per-category horizontal bars:** `<svg>` with `<rect>`, color graded: `<3.0 = #ef4444`, `3.0–3.7 = #f59e0b`, `>3.7 = #4ade80`.
- **Per-question distribution:** mini stacked-bar SVG inside each question row.
- **Likert distribution:** horizontal stacked bar SVG, 5 segments red→green.
- **Time trend:** SVG `<polyline>` with circles at data points.
- **Word cloud:** absolutely-positioned HTML `<span>`s with font-size scaled to log(frequency). Arabic stop-words (في، من، إلى، أن، على، ...) filtered out. No Latin tokens.

---

## 7. Project Structure

```
TrainingSurvey/
├── public/
│   ├── index.html               (name+email gate + survey)
│   ├── thanks.html
│   ├── admin-login.html         (admin password gate)
│   ├── admin.html               (admin dashboard — bento + glassmorphism)
│   ├── admin-report.html        (print-friendly view)
│   ├── questions.json
│   ├── css/
│   │   ├── survey.css
│   │   ├── admin.css
│   │   └── print.css
│   ├── js/
│   │   ├── survey.js            (gate logic, draft, validation, submit)
│   │   ├── admin-login.js       (login form, error handling)
│   │   ├── admin.js             (dashboard rendering, filters, exports)
│   │   ├── admin-charts.js      (SVG chart helpers)
│   │   └── shared/
│   │       ├── api.js           (fetch wrappers)
│   │       └── i18n.js          (Arabic-Indic numeral helpers, etc.)
│   └── fonts/DINNext/           (copied from DocsysFrontend)
├── netlify/
│   └── functions/
│       ├── submit.js
│       ├── admin-login.js
│       ├── admin-logout.js
│       ├── admin-stats.js
│       ├── admin-responses.js
│       ├── admin-export.js
│       └── _shared/
│           ├── auth.js          (HMAC cookie sign/verify, rate-limit)
│           ├── blobs.js         (Netlify Blobs read/write helpers)
│           ├── stats.js         (aggregation logic)
│           └── csv.js           (CSV serialization, UTF-8 BOM, Excel-compat)
├── netlify.toml
├── package.json                 (single dep: @netlify/blobs)
├── .gitignore
└── README.md
```

---

## 8. Security

| Concern | Mitigation |
|---|---|
| Admin password leak | Stored only in Netlify env var (`ADMIN_PASSWORD`), never in code. |
| Timing attack on login | `crypto.timingSafeEqual()` for both username and password. |
| Brute-force login | IP-keyed rate limit (5 attempts / 5 min → 429 for 10 min). State in `rate_limit` blob bucket with 10-min TTL. |
| Cookie tampering | HMAC-SHA256 signed cookie; `crypto.timingSafeEqual()` verify. |
| XSS in survey name / open text | Server strips HTML tags (`<>` regex) before storing. Dashboard renders text via `textContent`, never `innerHTML`. |
| CSRF on admin actions | `SameSite=Strict` cookie; admin endpoints reject cross-origin requests. |
| Email enumeration via duplicate response | The duplicate-confirmation response only reveals duplicate status AFTER name + email + answers are submitted. Acceptable for internal use; not a public sign-up form. |
| Function abuse / cost | Free tier ample for internal use (~150 trainees expected). Submit endpoint requires both name + email + full answers, naturally rate-limited. |

### Environment variables

| Name | Purpose |
|---|---|
| `ADMIN_USERNAME` | Plain string, e.g. `Admin` |
| `ADMIN_PASSWORD` | Plain string, e.g. `P@s$w0rd` |
| `ADMIN_SESSION_SECRET` | 32-byte hex string (generate with `openssl rand -hex 32`) |

---

## 9. Acceptance Criteria

1. Survey loads in <500ms on 3G mobile.
2. All 30 questions are renderable and submittable from `questions.json`.
3. Duplicate emails produce soft warning; both responses stored; second flagged `isDuplicate=true`.
4. Admin login with correct env-var credentials issues HMAC cookie; invalid credentials rate-limited.
5. Dashboard renders all 12 sections; date filter recomputes correctly.
6. JSON export contains full data + valid JSON parseable end-to-end.
7. CSV export opens in Excel with Arabic readable (UTF-8 BOM verified).
8. Print view at `/admin/report?from=&to=` produces a clean A4 PDF via browser print.
9. `localStorage` draft restores survey state on accidental refresh; cleared after successful submit.
10. Editing `questions.json` + redeploy changes the survey; old responses preserved (queryable by stable IDs).
11. Mobile layout works at 360px width; star buttons have ≥44px touch targets.
12. Admin "click respondent" does NOT reveal their per-question answers (privacy by design).

---

## 10. Out of Scope (YAGNI)

- Email notifications to admin on submission
- Real-time websocket updates / live polling
- Multi-admin roles or audit log
- Question editor UI (edit `questions.json` in git instead)
- Multiple language toggle (Arabic only)
- "Compare two date ranges" feature
- Sentiment / NLP analysis on text responses
- User-facing "view your own previous submission" feature
- Submission receipts / confirmation numbers shown to respondents
- OPAC (excluded per scope decision)
- Per-trainer or per-session-batch filtering (one survey for all)

---

## 11. Deployment

1. Initialize git repo in `F:\Projects\Cloned\08_OtherProjects\TrainingSurvey\`
2. Push to a private GitHub repository
3. On netlify.com: "Add new site" → "Import from Git" → connect repo
4. Set environment variables in Netlify dashboard:
   - `ADMIN_USERNAME=Admin`
   - `ADMIN_PASSWORD=P@s$w0rd`
   - `ADMIN_SESSION_SECRET=<openssl rand -hex 32>`
5. Deploy (Netlify auto-detects `netlify.toml`)
6. (Optional) Configure custom domain
7. Test all 12 acceptance criteria before sharing the link with trainees

---

**End of design specification.**
