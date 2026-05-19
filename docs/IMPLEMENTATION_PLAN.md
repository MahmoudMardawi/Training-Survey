# TrainingSurvey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Arabic-language training-feedback survey + admin dashboard, deployed to Netlify (static frontend + Functions + Blobs), per the spec in `docs/DESIGN.md`.

**Architecture:** Pure HTML/CSS/JS frontend (no framework, no CDN, self-hosted DINNext font) + Netlify Functions (Node.js stdlib + `@netlify/blobs`) + Netlify Blobs for storage. HMAC-signed cookies for admin auth. Wilayah palette (`#019443` / `#E9B90F`) for survey, glassmorphism bento dark for admin.

**Tech Stack:** Node.js 20+, `@netlify/blobs`, Node built-in `node:test`/`node:assert`/`node:crypto`, plain HTML5/CSS3/ES2022.

**Spec reference:** `docs/DESIGN.md` (this plan implements that spec exactly — when in doubt, the spec is authoritative).

---

## File structure produced by this plan

```
TrainingSurvey/
├── .gitignore
├── package.json
├── netlify.toml
├── README.md
├── docs/
│   ├── DESIGN.md                   (exists)
│   └── IMPLEMENTATION_PLAN.md      (this file)
├── public/
│   ├── index.html                  (name+email gate + survey)
│   ├── thanks.html                 (post-submission)
│   ├── admin-login.html
│   ├── admin.html                  (dashboard)
│   ├── admin-report.html           (print-friendly)
│   ├── questions.json
│   ├── css/
│   │   ├── survey.css
│   │   ├── admin.css
│   │   └── print.css
│   ├── js/
│   │   ├── survey.js
│   │   ├── admin-login.js
│   │   ├── admin.js
│   │   ├── admin-charts.js
│   │   └── shared/
│   │       ├── api.js
│   │       └── i18n.js
│   └── fonts/DINNext/
│       └── (font files copied from DocsysFrontend)
├── netlify/
│   └── functions/
│       ├── submit.js
│       ├── admin-login.js
│       ├── admin-logout.js
│       ├── admin-stats.js
│       ├── admin-responses.js
│       ├── admin-export.js
│       └── _shared/
│           ├── auth.js
│           ├── blobs.js
│           ├── stats.js
│           ├── csv.js
│           └── stopwords-ar.js
└── tests/
    ├── auth.test.js
    ├── stats.test.js
    ├── csv.test.js
    └── helpers/
        └── mock-blobs.js
```

---

## Phase 0 — Bootstrap

### Task 1: Initialize repository + base files

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `netlify.toml`
- Create: `README.md` (stub — will be filled in Task 28)

- [ ] **Step 1: `git init` in project root**

```bash
cd F:/Projects/Cloned/08_OtherProjects/TrainingSurvey
git init
git branch -M main
```

Expected: `Initialized empty Git repository in .../TrainingSurvey/.git/`

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
.netlify/
.env
.env.*
.DS_Store
Thumbs.db
.vscode/
.idea/
*.log
.superpowers/
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "training-survey",
  "version": "1.0.0",
  "description": "Arabic training-feedback survey for DocsysFrontend training program",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "test": "node --test tests/",
    "dev": "netlify dev",
    "deploy": "netlify deploy --prod"
  },
  "dependencies": {
    "@netlify/blobs": "^8.1.0"
  }
}
```

- [ ] **Step 4: Create `netlify.toml`**

```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/admin"
  to = "/admin.html"
  status = 200

[[redirects]]
  from = "/admin-login"
  to = "/admin-login.html"
  status = 200

[[redirects]]
  from = "/admin/report"
  to = "/admin-report.html"
  status = 200

[[redirects]]
  from = "/thanks"
  to = "/thanks.html"
  status = 200

[functions]
  node_bundler = "esbuild"
  included_files = ["public/questions.json"]

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    Permissions-Policy = "interest-cohort=()"
```

- [ ] **Step 5: Create stub `README.md`**

```markdown
# TrainingSurvey

Arabic training-feedback survey for the DocsysFrontend training program. See `docs/DESIGN.md` for design and `docs/IMPLEMENTATION_PLAN.md` for build steps.

(Full README written in Task 28.)
```

- [ ] **Step 6: Create folder structure**

```bash
mkdir -p public/css public/js/shared public/fonts/DINNext
mkdir -p netlify/functions/_shared
mkdir -p tests/helpers
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json netlify.toml README.md docs/
git commit -m "chore: bootstrap project scaffold"
```

---

### Task 2: Copy DINNext font + add font-face CSS

**Files:**
- Copy: `F:/Projects/Cloned/DocsysFrontend/src/MainApp.Web/wwwroot/fonts/ThemeNew/DINNEXT/` → `public/fonts/DINNext/`

- [ ] **Step 1: Copy font files (PowerShell)**

```powershell
Copy-Item -Recurse -Force `
  "F:\Projects\Cloned\DocsysFrontend\src\MainApp.Web\wwwroot\fonts\ThemeNew\DINNEXT\*" `
  "F:\Projects\Cloned\08_OtherProjects\TrainingSurvey\public\fonts\DINNext\"
```

- [ ] **Step 2: Verify font files exist**

```powershell
Get-ChildItem "F:\Projects\Cloned\08_OtherProjects\TrainingSurvey\public\fonts\DINNext\" | Select-Object Name
```

Expected: `.eot`, `.woff`, `.ttf`, `.svg` variants present.

- [ ] **Step 3: Commit**

```bash
git add public/fonts/
git commit -m "chore: copy DINNext Arabic font from DocsysFrontend"
```

---

## Phase 1 — Question schema

### Task 3: Create `questions.json`

**Files:**
- Create: `public/questions.json`

- [ ] **Step 1: Write the schema (exact content per spec)**

```json
{
  "version": 1,
  "title": "استبيان تقييم البرنامج التدريبي على نظام Docsys",
  "subtitle": "نشكر تعاونكم في تطوير برامجنا التدريبية",
  "intro": "يستغرق الاستبيان نحو ٧–٨ دقائق. إجاباتكم محل تقدير، ولن تُربط بأسمائكم في التقارير العامة.",
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

- [ ] **Step 2: Validate JSON**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('public/questions.json', 'utf8')).sections.flatMap(s => s.questions).length)"
```

Expected output: `30`

- [ ] **Step 3: Commit**

```bash
git add public/questions.json
git commit -m "feat: add survey question schema (30 items across 7 sections)"
```

---

## Phase 2 — Backend foundations (test-driven)

### Task 4: Auth helper — HMAC cookie sign/verify

**Files:**
- Create: `netlify/functions/_shared/auth.js`
- Create: `tests/auth.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/auth.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession, hashEmail } from '../netlify/functions/_shared/auth.js';

const SECRET = 'a'.repeat(64);

describe('signSession / verifySession', () => {
  test('round-trip: signed session verifies', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, 4 * 60 * 60);
    const payload = verifySession(cookie, SECRET);
    assert.equal(payload.u, 'Admin');
    assert.ok(payload.exp > Math.floor(Date.now() / 1000));
  });

  test('tampered payload fails verification', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, 3600);
    const [payload, sig] = cookie.split('.');
    const tampered = Buffer.from(JSON.stringify({ u: 'Hacker', iat: 0, exp: 9999999999 })).toString('base64url') + '.' + sig;
    assert.equal(verifySession(tampered, SECRET), null);
  });

  test('expired cookie fails verification', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, -10); // already expired
    assert.equal(verifySession(cookie, SECRET), null);
  });

  test('wrong secret fails verification', () => {
    const cookie = signSession({ u: 'Admin' }, SECRET, 3600);
    assert.equal(verifySession(cookie, 'b'.repeat(64)), null);
  });

  test('malformed cookie fails verification gracefully', () => {
    assert.equal(verifySession('notacookie', SECRET), null);
    assert.equal(verifySession('', SECRET), null);
    assert.equal(verifySession(null, SECRET), null);
  });
});

describe('hashEmail', () => {
  test('produces deterministic sha256 hex', () => {
    const h = hashEmail('User@Example.com');
    assert.equal(h, hashEmail('user@example.com')); // case-insensitive
    assert.match(h, /^[a-f0-9]{64}$/);
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
node --test tests/auth.test.js
```

Expected: All tests fail with "Cannot find module".

- [ ] **Step 3: Implement `auth.js`**

```javascript
// netlify/functions/_shared/auth.js
import crypto from 'node:crypto';

/**
 * Sign a session payload into a cookie string: base64url(payload).hex(hmac).
 * @param {object} data — payload to include (e.g., { u: 'Admin' })
 * @param {string} secret — HMAC key
 * @param {number} ttlSeconds — lifetime in seconds (negative for already-expired in tests)
 * @returns {string}
 */
export function signSession(data, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...data, iat: now, exp: now + ttlSeconds };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${sig}`;
}

/**
 * Verify a cookie. Returns the payload if valid + unexpired, otherwise null.
 * Constant-time comparison; gracefully handles malformed input.
 */
export function verifySession(cookie, secret) {
  if (!cookie || typeof cookie !== 'string') return null;
  const parts = cookie.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  let valid;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return null;
  }
  if (!valid) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}

/**
 * Hash an email for use as an index key. Case-insensitive.
 */
export function hashEmail(email) {
  return crypto.createHash('sha256').update(String(email).toLowerCase().trim()).digest('hex');
}

/**
 * Constant-time string comparison for password verification.
 */
export function timingSafeStringEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    // Pad the shorter one and compare anyway, then return false — avoids early-exit timing leak
    const max = Math.max(aBuf.length, bBuf.length);
    crypto.timingSafeEqual(Buffer.alloc(max, 0), Buffer.alloc(max, 0));
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
node --test tests/auth.test.js
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_shared/auth.js tests/auth.test.js
git commit -m "feat(auth): HMAC cookie sign/verify + email hash helpers"
```

---

### Task 5: Mock Blobs helper for tests

**Files:**
- Create: `tests/helpers/mock-blobs.js`

- [ ] **Step 1: Implement in-memory mock**

```javascript
// tests/helpers/mock-blobs.js
/**
 * In-memory mock of @netlify/blobs `getStore()` for unit tests.
 * Each call to mockBlobs() returns a fresh independent store.
 */
export function mockBlobs() {
  const stores = new Map();

  return {
    getStore(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        async get(key, { type = 'text' } = {}) {
          if (!data.has(key)) return null;
          const val = data.get(key);
          if (type === 'json') return JSON.parse(val);
          return val;
        },
        async set(key, value) {
          data.set(key, typeof value === 'string' ? value : JSON.stringify(value));
        },
        async setJSON(key, value) {
          data.set(key, JSON.stringify(value));
        },
        async delete(key) {
          data.delete(key);
        },
        async list({ prefix = '' } = {}) {
          const blobs = [];
          for (const k of data.keys()) {
            if (k.startsWith(prefix)) blobs.push({ key: k });
          }
          return { blobs };
        },
      };
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/helpers/mock-blobs.js
git commit -m "test: in-memory @netlify/blobs mock"
```

---

### Task 6: Stats aggregation helper

**Files:**
- Create: `netlify/functions/_shared/stats.js`
- Create: `tests/stats.test.js`
- Create: `netlify/functions/_shared/stopwords-ar.js`

- [ ] **Step 1: Create Arabic stop-word list**

```javascript
// netlify/functions/_shared/stopwords-ar.js
// Common Arabic stop words to exclude from word cloud.
export const AR_STOPWORDS = new Set([
  'في', 'من', 'إلى', 'على', 'عن', 'مع', 'بعد', 'قبل', 'حتى', 'عند', 'لدى',
  'أن', 'إن', 'أنّ', 'إنّ', 'كان', 'كانت', 'يكون', 'تكون', 'كنت', 'كنّا',
  'و', 'أو', 'لا', 'لم', 'لن', 'قد', 'لقد', 'إذا', 'لكن', 'لكنّ', 'بل', 'بلى', 'نعم',
  'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء', 'أولئك',
  'الذي', 'التي', 'الذين', 'اللواتي', 'اللاتي',
  'هو', 'هي', 'هما', 'هم', 'هنّ', 'نحن', 'أنا', 'أنت', 'أنتم', 'أنتنّ',
  'كل', 'بعض', 'جميع', 'غير', 'كذلك', 'أيضا', 'أيضاً',
  'كما', 'مثل', 'حول', 'خلال', 'بين', 'بسبب', 'لأن', 'لأنّ',
  'جدا', 'جداً', 'فقط', 'حيث', 'بحيث', 'بالنسبة', 'ضمن', 'حسب', 'بشأن',
  'سوف', 'قبل', 'بعد', 'منذ', 'لدى', 'لدى',
]);
```

- [ ] **Step 2: Write failing test**

```javascript
// tests/stats.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from '../netlify/functions/_shared/stats.js';

const schema = {
  version: 1,
  sections: [
    { id: 'trainer', title: 'تقييم المدرّب', questions: [
      { id: 'q1', type: 'stars',  label: '...', required: true },
      { id: 'q2', type: 'likert', label: '...', required: true },
    ]},
    { id: 'overall', title: 'التقييم العام', questions: [
      { id: 'q3', type: 'nps', label: '...', required: true },
    ]},
    { id: 'feedback', title: 'الملاحظات', questions: [
      { id: 't1', type: 'textarea', label: '...', required: true },
    ]},
  ],
};

const responses = [
  { responseId: 'r1', submittedAt: '2026-05-20T10:00:00Z', isDuplicate: false,
    answers: { q1: 5, q2: 'agree', q3: 9, t1: 'كان البرنامج ممتازاً والمحتوى رائعاً' } },
  { responseId: 'r2', submittedAt: '2026-05-20T11:00:00Z', isDuplicate: false,
    answers: { q1: 4, q2: 'strongly_agree', q3: 7, t1: 'المحتوى مفيد جداً' } },
  { responseId: 'r3', submittedAt: '2026-05-21T09:00:00Z', isDuplicate: true,
    answers: { q1: 1, q2: 'disagree', q3: 3, t1: 'تجربة سيئة' } },
];

describe('computeStats', () => {
  test('totals and uniqueRespondents reflect duplicate filter', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    assert.equal(stats.kpis.totalResponses, 2);
    assert.equal(stats.kpis.uniqueRespondents, 2);

    const statsAll = computeStats(schema, responses, { includeDuplicates: true });
    assert.equal(statsAll.kpis.totalResponses, 3);
  });

  test('star average is correct', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const q1 = stats.perQuestion.find(q => q.id === 'q1');
    assert.equal(q1.avg, 4.5); // (5+4)/2
    assert.deepEqual(q1.distribution, { '1':0, '2':0, '3':0, '4':1, '5':1 });
  });

  test('likert distribution is correct', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const q2 = stats.perQuestion.find(q => q.id === 'q2');
    assert.equal(q2.distribution.agree, 1);
    assert.equal(q2.distribution.strongly_agree, 1);
    assert.equal(q2.distribution.neutral, 0);
  });

  test('NPS computed correctly', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const q3 = stats.perQuestion.find(q => q.id === 'q3');
    // r1=9 (promoter), r2=7 (passive). 1 promoter, 0 detractors, 1 passive.
    // NPS = (1/2 - 0/2) * 100 = 50
    assert.equal(q3.promoters, 1);
    assert.equal(q3.passives, 1);
    assert.equal(q3.detractors, 0);
    assert.equal(stats.kpis.npsScore, 50);
  });

  test('category averages computed', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const trainer = stats.categoryAverages.find(c => c.id === 'trainer');
    // q1=4.5 stars. q2 likert maps agree=4, strongly_agree=5 → avg=4.5
    // category avg = (4.5 + 4.5) / 2 = 4.5
    assert.equal(trainer.avg, 4.5);
  });

  test('text responses included (responseId only, no respondent)', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const t1 = stats.textResponses.find(t => t.id === 't1');
    assert.equal(t1.responses.length, 2);
    assert.equal(t1.responses[0].responseId, 'r1');
    assert.equal(t1.responses[0].text, 'كان البرنامج ممتازاً والمحتوى رائعاً');
    assert.ok(!('name' in t1.responses[0])); // privacy: no name field
  });

  test('word cloud filters stopwords and counts frequency', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const words = stats.wordCloud.map(w => w.word);
    assert.ok(words.includes('المحتوى')); // appears twice
    assert.ok(!words.includes('في')); // stop word
  });

  test('topRated and bottomRated identified', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    assert.ok(Array.isArray(stats.topRated));
    assert.ok(stats.topRated.length <= 3);
    assert.ok(Array.isArray(stats.bottomRated));
  });

  test('timeTrend groups by date', () => {
    const stats = computeStats(schema, responses, { includeDuplicates: false });
    const may20 = stats.timeTrend.find(d => d.date === '2026-05-20');
    assert.equal(may20.count, 2);
  });

  test('date filter restricts to range', () => {
    const stats = computeStats(schema, responses, {
      includeDuplicates: true,
      from: '2026-05-21T00:00:00Z',
      to:   '2026-05-21T23:59:59Z',
    });
    assert.equal(stats.kpis.totalResponses, 1);
  });
});
```

- [ ] **Step 3: Run, verify FAIL**

```bash
node --test tests/stats.test.js
```

Expected: All tests fail (module missing).

- [ ] **Step 4: Implement `stats.js`**

```javascript
// netlify/functions/_shared/stats.js
import { AR_STOPWORDS } from './stopwords-ar.js';

const LIKERT_TO_NUM = { strongly_disagree: 1, disagree: 2, neutral: 3, agree: 4, strongly_agree: 5 };

function round1(n) { return Math.round(n * 10) / 10; }

function inRange(iso, from, to) {
  if (!from && !to) return true;
  const t = Date.parse(iso);
  if (from && t < Date.parse(from)) return false;
  if (to   && t > Date.parse(to))   return false;
  return true;
}

export function computeStats(schema, allResponses, { from, to, includeDuplicates = false } = {}) {
  // 1. Filter
  const filtered = allResponses.filter(r =>
    inRange(r.submittedAt, from, to) && (includeDuplicates || !r.isDuplicate)
  );

  // 2. Build a flat question map
  const questions = [];
  for (const sec of schema.sections) {
    for (const q of sec.questions) {
      questions.push({ ...q, sectionId: sec.id });
    }
  }

  // 3. KPIs
  const totalResponses = filtered.length;
  const uniqueEmails = new Set(filtered.map(r => (r.respondent?.email || '').toLowerCase()));
  const uniqueRespondents = uniqueEmails.size;

  // Completion rate: % of required questions answered, averaged across all responses.
  const requiredIds = questions.filter(q => q.required).map(q => q.id);
  const completionPerResponse = filtered.map(r => {
    const answered = requiredIds.filter(id => r.answers?.[id] !== null && r.answers?.[id] !== undefined && r.answers?.[id] !== '').length;
    return answered / Math.max(requiredIds.length, 1);
  });
  const completionRate = totalResponses > 0
    ? completionPerResponse.reduce((a,b)=>a+b,0) / totalResponses
    : 0;

  // 4. Per-question stats
  const perQuestion = [];
  for (const q of questions) {
    const vals = filtered.map(r => r.answers?.[q.id]).filter(v => v !== null && v !== undefined && v !== '');

    if (q.type === 'stars') {
      const dist = { '1':0,'2':0,'3':0,'4':0,'5':0 };
      let sum = 0;
      for (const v of vals) { dist[String(v)] = (dist[String(v)]||0)+1; sum += Number(v); }
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'stars', label: q.label,
        avg: vals.length ? round1(sum / vals.length) : null,
        count: vals.length,
        distribution: dist,
      });
    } else if (q.type === 'likert') {
      const dist = { strongly_disagree:0, disagree:0, neutral:0, agree:0, strongly_agree:0 };
      let sum = 0;
      for (const v of vals) { dist[v] = (dist[v]||0)+1; sum += (LIKERT_TO_NUM[v] || 0); }
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'likert', label: q.label,
        avg: vals.length ? round1(sum / vals.length) : null,
        count: vals.length,
        distribution: dist,
      });
    } else if (q.type === 'nps') {
      const dist = Object.fromEntries([...Array(11).keys()].map(i => [String(i), 0]));
      let promoters = 0, passives = 0, detractors = 0;
      for (const v of vals) {
        dist[String(v)] = (dist[String(v)]||0)+1;
        if (v >= 9) promoters++;
        else if (v >= 7) passives++;
        else detractors++;
      }
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'nps', label: q.label,
        count: vals.length,
        distribution: dist,
        promoters, passives, detractors,
      });
    } else if (q.type === 'textarea') {
      perQuestion.push({
        id: q.id, sectionId: q.sectionId, type: 'textarea', label: q.label,
        count: vals.length,
      });
    }
  }

  // 5. Category averages (only star/likert questions contribute)
  const categoryAverages = [];
  for (const sec of schema.sections) {
    const inSec = perQuestion.filter(q => q.sectionId === sec.id && (q.type === 'stars' || q.type === 'likert'));
    if (inSec.length === 0) continue;
    const totalAvg = inSec.reduce((s, q) => s + (q.avg || 0), 0) / inSec.length;
    categoryAverages.push({ id: sec.id, title: sec.title, avg: round1(totalAvg), count: filtered.length });
  }

  // 6. Top/bottom rated (stars + likert only)
  const ranked = perQuestion
    .filter(q => (q.type === 'stars' || q.type === 'likert') && q.avg != null)
    .sort((a, b) => b.avg - a.avg);
  const topRated = ranked.slice(0, 3).map(q => ({ id: q.id, label: q.label, avg: q.avg }));
  const bottomRated = ranked.slice(-3).reverse().map(q => ({ id: q.id, label: q.label, avg: q.avg }));

  // 7. NPS overall score (use the overall_nps question if present)
  const npsQ = perQuestion.find(q => q.type === 'nps');
  const npsScore = npsQ && npsQ.count > 0
    ? Math.round(((npsQ.promoters - npsQ.detractors) / npsQ.count) * 100)
    : null;

  // 8. Overall satisfaction (avg of all star+likert avgs)
  const rateables = perQuestion.filter(q => (q.type === 'stars' || q.type === 'likert') && q.avg != null);
  const overallSatisfactionAvg = rateables.length
    ? round1(rateables.reduce((s,q) => s + q.avg, 0) / rateables.length)
    : null;

  // 9. Text responses (no respondent identity attached — privacy)
  const textResponses = [];
  for (const q of questions.filter(q => q.type === 'textarea')) {
    const responses = filtered
      .filter(r => r.answers?.[q.id] && String(r.answers[q.id]).trim() !== '')
      .map(r => ({ responseId: r.responseId, text: r.answers[q.id] }));
    textResponses.push({ id: q.id, label: q.label, responses });
  }

  // 10. Word cloud
  const wordCounts = new Map();
  for (const t of textResponses) {
    for (const r of t.responses) {
      const tokens = String(r.text).split(/[\s,.!?؟،؛:"'()\-—_\/\[\]{}]+/u);
      for (const raw of tokens) {
        const w = raw.replace(/[ً-ٰٟ]/g, ''); // strip diacritics
        if (!w || w.length < 3) continue;
        if (AR_STOPWORDS.has(w)) continue;
        if (/^[a-zA-Z0-9]+$/.test(w)) continue; // skip pure Latin/numeric
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
    }
  }
  const wordCloud = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([word, count]) => ({ word, count }));

  // 11. Time trend (group by ISO date)
  const dateMap = new Map();
  for (const r of filtered) {
    const d = r.submittedAt.slice(0, 10);
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  }
  const timeTrend = [...dateMap.entries()].sort().map(([date, count]) => ({ date, count }));

  return {
    filters: { from: from || null, to: to || null, includeDuplicates },
    kpis: {
      totalResponses,
      uniqueRespondents,
      overallSatisfactionAvg,
      npsScore,
      completionRate: round1(completionRate * 100) / 100,
    },
    categoryAverages,
    perQuestion,
    topRated,
    bottomRated,
    textResponses,
    wordCloud,
    timeTrend,
  };
}
```

- [ ] **Step 5: Run tests, verify PASS**

```bash
node --test tests/stats.test.js
```

Expected: All 10 tests pass.

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/_shared/stats.js netlify/functions/_shared/stopwords-ar.js tests/stats.test.js
git commit -m "feat(stats): aggregation helper with KPIs, distributions, NPS, word cloud"
```

---

### Task 7: CSV serialization helper

**Files:**
- Create: `netlify/functions/_shared/csv.js`
- Create: `tests/csv.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// tests/csv.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { responsesToCSV } from '../netlify/functions/_shared/csv.js';

const schema = {
  sections: [
    { id: 's', questions: [
      { id: 'q1', type: 'stars',    label: 'q1' },
      { id: 'q2', type: 'likert',   label: 'q2' },
      { id: 'q3', type: 'nps',      label: 'q3' },
      { id: 't1', type: 'textarea', label: 't1' },
    ]},
  ],
};

const rows = [
  { responseId: 'r1', submittedAt: '2026-05-20T10:00:00Z', isDuplicate: false,
    respondent: { name: 'محمد', email: 'a@b.com' },
    answers: { q1: 5, q2: 'agree', q3: 9, t1: 'نص "مع علامات" يحتوي ; , فاصلة' } },
];

describe('responsesToCSV', () => {
  test('starts with UTF-8 BOM', () => {
    const csv = responsesToCSV(schema, rows);
    assert.equal(csv.charCodeAt(0), 0xFEFF);
  });

  test('header includes likert numeric column', () => {
    const csv = responsesToCSV(schema, rows);
    const firstLine = csv.replace(/^﻿/, '').split('\r\n')[0];
    assert.ok(firstLine.includes('q2'));
    assert.ok(firstLine.includes('q2_num'));
  });

  test('values are properly quoted (commas/quotes preserved)', () => {
    const csv = responsesToCSV(schema, rows);
    const dataLine = csv.replace(/^﻿/, '').split('\r\n')[1];
    assert.ok(dataLine.includes('"نص ""مع علامات"" يحتوي ; , فاصلة"'));
  });

  test('CRLF line endings', () => {
    const csv = responsesToCSV(schema, rows);
    assert.ok(csv.includes('\r\n'));
  });

  test('likert column has both string and numeric variants', () => {
    const csv = responsesToCSV(schema, rows);
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    const header = lines[0].split(',');
    const data   = lines[1].split(',');
    const idxQ2     = header.indexOf('q2');
    const idxQ2Num  = header.indexOf('q2_num');
    assert.equal(data[idxQ2], 'agree');
    assert.equal(data[idxQ2Num], '4');
  });

  test('isDuplicate column included as 0/1', () => {
    const csv = responsesToCSV(schema, rows);
    const header = csv.replace(/^﻿/, '').split('\r\n')[0].split(',');
    assert.ok(header.includes('isDuplicate'));
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

```bash
node --test tests/csv.test.js
```

- [ ] **Step 3: Implement `csv.js`**

```javascript
// netlify/functions/_shared/csv.js
const LIKERT_TO_NUM = { strongly_disagree: 1, disagree: 2, neutral: 3, agree: 4, strongly_agree: 5 };

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\r\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialize response rows to CSV.
 *  - UTF-8 BOM prefix (so Excel renders Arabic correctly)
 *  - CRLF line endings
 *  - RFC 4180 quoting (commas, quotes, semicolons, newlines)
 *  - Likert columns produce TWO entries: `<id>` (string) AND `<id>_num` (1–5)
 */
export function responsesToCSV(schema, responses) {
  const flat = [];
  for (const sec of schema.sections) for (const q of sec.questions) flat.push(q);

  const headers = ['responseId', 'submittedAt', 'name', 'email', 'isDuplicate'];
  for (const q of flat) {
    headers.push(q.id);
    if (q.type === 'likert') headers.push(`${q.id}_num`);
  }

  const lines = [headers.join(',')];
  for (const r of responses) {
    const cells = [
      csvCell(r.responseId),
      csvCell(r.submittedAt),
      csvCell(r.respondent?.name),
      csvCell(r.respondent?.email),
      csvCell(r.isDuplicate ? 1 : 0),
    ];
    for (const q of flat) {
      const v = r.answers?.[q.id];
      cells.push(csvCell(v));
      if (q.type === 'likert') {
        cells.push(csvCell(v != null ? (LIKERT_TO_NUM[v] ?? '') : ''));
      }
    }
    lines.push(cells.join(','));
  }

  return '﻿' + lines.join('\r\n');
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
node --test tests/csv.test.js
```

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/_shared/csv.js tests/csv.test.js
git commit -m "feat(csv): Excel-compatible UTF-8 BOM CSV serializer with likert string+numeric columns"
```

---

### Task 8: Blobs wrapper helper

**Files:**
- Create: `netlify/functions/_shared/blobs.js`

- [ ] **Step 1: Implement wrapper**

```javascript
// netlify/functions/_shared/blobs.js
import { getStore } from '@netlify/blobs';

/**
 * Thin facade so that:
 *   - Function code never imports @netlify/blobs directly (easier to swap/mock).
 *   - Bucket names are centralized.
 *   - JSON read/write is convenient.
 *
 * Buckets:
 *   - responses     : key = `{ISO}-{shortId}`, value = full response object
 *   - email_index   : key = sha256(email), value = { emailHash, firstSubmittedAt, submissionCount, responseIds }
 *   - rate_limit    : key = ip-hash, value = { count, firstAttemptAt }
 */
export function responsesStore() { return getStore('responses'); }
export function emailIndexStore() { return getStore('email_index'); }
export function rateLimitStore() { return getStore('rate_limit'); }

export async function listAllResponses() {
  const store = responsesStore();
  const { blobs } = await store.list();
  const out = [];
  for (const b of blobs) {
    const json = await store.get(b.key, { type: 'json' });
    if (json) out.push(json);
  }
  // newest first
  out.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return out;
}
```

- [ ] **Step 2: Install `@netlify/blobs`**

```bash
npm install
```

Expected: `node_modules/` populated, `package-lock.json` created.

- [ ] **Step 3: Add `package-lock.json` to git**

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/_shared/blobs.js package-lock.json
git commit -m "feat(blobs): Netlify Blobs wrapper with bucket facades"
```

---

## Phase 3 — Submit flow

### Task 9: Submit function

**Files:**
- Create: `netlify/functions/submit.js`

- [ ] **Step 1: Implement**

```javascript
// netlify/functions/submit.js
import crypto from 'node:crypto';
import { responsesStore, emailIndexStore } from './_shared/blobs.js';
import { hashEmail } from './_shared/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripHTML(str) {
  return String(str ?? '').replace(/<[^>]*>/g, '').trim();
}

function nowIso() {
  return new Date().toISOString();
}

function shortId() {
  return crypto.randomBytes(4).toString('hex');
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }

  const name = stripHTML(body.name).slice(0, 200);
  const email = stripHTML(body.email).toLowerCase().slice(0, 320);
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : null;
  const confirmDuplicate = !!body.confirmDuplicate;

  if (!name || !EMAIL_RE.test(email) || !answers) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Sanitize text answers (strip any HTML)
  const cleanAnswers = {};
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v === 'string') cleanAnswers[k] = stripHTML(v).slice(0, 2000);
    else cleanAnswers[k] = v;
  }

  const emailHash = hashEmail(email);
  const idxStore = emailIndexStore();
  const existingIndex = (await idxStore.get(emailHash, { type: 'json' })) || null;

  if (existingIndex && !confirmDuplicate) {
    // Soft-warn: ask client to confirm before storing duplicate
    return new Response(JSON.stringify({ requiresConfirmation: true, isDuplicate: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  const submittedAt = nowIso();
  const responseId = `${submittedAt.replace(/[:.]/g, '-')}-${shortId()}`;
  const submissionCount = (existingIndex?.submissionCount || 0) + 1;
  const response = {
    responseId,
    submittedAt,
    respondent: { name, email },
    isDuplicate: submissionCount > 1,
    submissionCountForEmail: submissionCount,
    userAgent: req.headers.get('user-agent') || '',
    questionsVersion: typeof body.questionsVersion === 'number' ? body.questionsVersion : 1,
    answers: cleanAnswers,
  };

  await responsesStore().setJSON(responseId, response);

  const newIndex = {
    emailHash,
    firstSubmittedAt: existingIndex?.firstSubmittedAt || submittedAt,
    submissionCount,
    responseIds: [...(existingIndex?.responseIds || []), responseId],
  };
  await idxStore.setJSON(emailHash, newIndex);

  return new Response(JSON.stringify({ responseId, isDuplicate: response.isDuplicate }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/submit' };
```

- [ ] **Step 2: Commit**

```bash
git add netlify/functions/submit.js
git commit -m "feat(api): POST /api/submit with email hashing + soft duplicate confirmation"
```

---

## Phase 4 — Survey frontend

### Task 10: Survey CSS (Wilayah palette, RTL, sticky progress)

**Files:**
- Create: `public/css/survey.css`

- [ ] **Step 1: Implement**

```css
/* public/css/survey.css */
@font-face {
  font-family: 'DINNext';
  src: url('/fonts/DINNext/DINNextLTArabic-Regular.woff') format('woff'),
       url('/fonts/DINNext/DINNextLTArabic-Regular.ttf')  format('truetype');
  font-style: normal; font-weight: 400; font-display: swap;
}

:root {
  --primary: #019443;
  --primary-light: #00cf05;
  --secondary: #E9B90F;
  --tertiary: #A3A3A3;
  --bg: #ffffff;
  --surface: #fafafa;
  --border: #e0e0e0;
  --text: #1f2937;
  --text-muted: #6b7280;
  --error: #ef4444;
  --success: #019443;
  --star-empty: rgba(0,0,0,0.15);
  --star-fill: var(--secondary);
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); }
body {
  font-family: 'DINNext', 'Segoe UI', Tahoma, sans-serif;
  font-size: 16px; line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

main { max-width: 720px; margin: 0 auto; padding: 24px; }

/* Gate */
.gate { display: flex; flex-direction: column; gap: 16px; padding-top: 40px; }
.gate h1 { font-size: 26px; color: var(--primary); margin: 0; }
.gate .subtitle { color: var(--text-muted); font-size: 15px; margin: 0; }
.gate .intro { background: var(--surface); border-inline-start: 4px solid var(--secondary); padding: 12px 16px; border-radius: 6px; font-size: 14px; }
.gate label { display: block; font-weight: 600; margin-bottom: 6px; }
.gate input {
  width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: 6px;
  font-family: inherit; font-size: 15px; background: #fff;
}
.gate input:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
.gate input.invalid { border-color: var(--error); }
.gate .err { color: var(--error); font-size: 13px; margin-top: 4px; }

/* Sticky progress */
.progress-bar {
  position: sticky; top: 0; z-index: 10;
  background: rgba(255,255,255,0.96); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
  display: flex; align-items: center; gap: 12px;
}
.progress-bar .track { flex: 1; height: 8px; background: #e6e6e6; border-radius: 4px; overflow: hidden; }
.progress-bar .fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--primary), var(--primary-light));
  transition: width 0.25s ease;
}
.progress-bar .count { font-size: 13px; color: var(--text-muted); white-space: nowrap; }

/* Section headers */
.section { margin-top: 28px; }
.section h2 {
  font-size: 18px; color: var(--primary); margin: 0 0 12px 0;
  padding-bottom: 8px; border-bottom: 2px solid var(--secondary);
  position: relative; display: inline-block;
}
.section h2::before {
  content: ''; position: absolute; inset-inline-end: -10px; top: 2px;
  width: 4px; height: 16px; background: var(--secondary); border-radius: 2px;
}

/* Question row */
.q-row {
  background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  padding: 14px 16px; margin-bottom: 10px;
  display: flex; flex-direction: column; gap: 10px;
}
.q-row .label { font-weight: 500; font-size: 15px; line-height: 1.6; }
.q-row .label .required { color: var(--error); margin-inline-start: 4px; }

/* Star rating */
.stars {
  display: inline-flex; gap: 4px; flex-direction: row-reverse; /* RTL: visual left-to-right rises */
}
.stars button {
  background: transparent; border: none; cursor: pointer;
  font-size: 32px; line-height: 1; color: var(--star-empty);
  padding: 8px; min-width: 44px; min-height: 44px;
  transition: color 0.15s ease, transform 0.1s ease;
}
.stars button[aria-checked="true"],
.stars button[aria-checked="true"] ~ button { color: var(--star-fill); }
.stars button:hover { transform: scale(1.1); }
.stars button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 4px; }

/* Likert */
.likert { display: flex; gap: 6px; flex-wrap: wrap; flex-direction: row-reverse; }
.likert button {
  flex: 1; min-width: 100px; padding: 10px 12px; border-radius: 6px;
  background: #fff; border: 1px solid var(--border); color: var(--text);
  font-family: inherit; font-size: 13px; cursor: pointer;
  transition: all 0.15s ease; min-height: 44px;
}
.likert button[aria-checked="true"] { background: var(--primary); border-color: var(--primary); color: #fff; }
.likert button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

/* NPS */
.nps { display: flex; gap: 4px; flex-direction: row-reverse; flex-wrap: wrap; }
.nps button {
  width: 40px; height: 40px; min-width: 40px; border-radius: 6px;
  background: #fff; border: 1px solid var(--border); cursor: pointer;
  font-family: inherit; font-size: 14px; color: var(--text);
}
.nps button[aria-checked="true"] { background: var(--primary); border-color: var(--primary); color: #fff; }
.nps button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.nps .legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 4px; }

/* Textarea */
.q-row textarea {
  width: 100%; min-height: 110px; padding: 12px; border: 1px solid var(--border);
  border-radius: 6px; font-family: inherit; font-size: 14px; resize: vertical;
}
.q-row textarea:focus { outline: 2px solid var(--primary); outline-offset: 1px; }
.q-row .charcount { font-size: 12px; color: var(--text-muted); text-align: end; }

/* Submit */
.submit-row { margin-top: 32px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.btn-primary {
  background: var(--secondary); color: #fff; padding: 14px 36px;
  border: none; border-radius: 6px; font-family: inherit; font-weight: 700;
  font-size: 16px; cursor: pointer; min-width: 240px;
  transition: filter 0.15s ease;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary.loading { color: transparent; position: relative; }
.btn-primary.loading::after {
  content: ''; position: absolute; inset: 0; margin: auto; width: 20px; height: 20px;
  border: 3px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Duplicate modal */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex;
  align-items: center; justify-content: center; padding: 16px; z-index: 100;
}
.modal {
  background: #fff; border-radius: 12px; padding: 24px; max-width: 480px; width: 100%;
}
.modal h3 { margin-top: 0; color: var(--primary); }
.modal .actions { display: flex; gap: 10px; margin-top: 18px; flex-direction: row-reverse; }
.btn-outline {
  background: transparent; color: var(--primary); border: 2px solid var(--primary);
  padding: 10px 20px; border-radius: 6px; font-family: inherit; cursor: pointer;
}

/* Toast */
.toast {
  position: fixed; bottom: 24px; inset-inline: 16px; max-width: 480px; margin: 0 auto;
  background: #fff; border-inline-start: 4px solid var(--error); border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15); padding: 14px 16px; z-index: 200;
}
.toast.success { border-inline-start-color: var(--success); }

/* Thanks page */
.thanks { text-align: center; padding: 80px 24px; }
.thanks .icon { font-size: 64px; color: var(--primary); }
.thanks h1 { color: var(--primary); margin: 16px 0 8px; }
.thanks p { color: var(--text-muted); max-width: 480px; margin: 0 auto; }

/* Responsive */
@media (max-width: 600px) {
  main { padding: 16px; }
  .gate h1 { font-size: 22px; }
  .likert button { font-size: 12px; min-width: 80px; }
  .nps button { width: 32px; min-width: 32px; }
  .stars button { font-size: 28px; padding: 6px; min-width: 40px; }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/css/survey.css
git commit -m "feat(ui): survey CSS — Wilayah palette, RTL, sticky progress, components"
```

---

### Task 11: Shared JS — api.js and i18n.js

**Files:**
- Create: `public/js/shared/api.js`
- Create: `public/js/shared/i18n.js`

- [ ] **Step 1: Implement `api.js`**

```javascript
// public/js/shared/api.js
export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function loadQuestions() {
  const res = await fetch('/questions.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load questions.json');
  return res.json();
}
```

- [ ] **Step 2: Implement `i18n.js`**

```javascript
// public/js/shared/i18n.js
const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

/** Convert ASCII digits in a string to Arabic-Indic. */
export function toArDigits(str) {
  return String(str).replace(/[0-9]/g, d => AR_DIGITS[+d]);
}

export const LIKERT_LABELS = {
  strongly_disagree: 'لا أوافق بشدة',
  disagree:          'لا أوافق',
  neutral:           'محايد',
  agree:             'أوافق',
  strongly_agree:    'أوافق بشدة',
};

export const LIKERT_ORDER = ['strongly_disagree','disagree','neutral','agree','strongly_agree'];
```

- [ ] **Step 3: Commit**

```bash
git add public/js/shared/
git commit -m "feat(ui): shared api.js (fetch wrapper) and i18n.js (Arabic-Indic digits, Likert labels)"
```

---

### Task 12: Survey HTML

**Files:**
- Create: `public/index.html`

- [ ] **Step 1: Implement**

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>استبيان تقييم البرنامج التدريبي على نظام Docsys</title>
  <link rel="stylesheet" href="/css/survey.css">
</head>
<body>
  <main id="app" aria-live="polite">
    <!-- Gate state: name + email -->
    <section id="gate" class="gate">
      <h1>استبيان تقييم البرنامج التدريبي على نظام Docsys</h1>
      <p class="subtitle">نشكر تعاونكم في تطوير برامجنا التدريبية</p>
      <div class="intro" id="intro">يستغرق الاستبيان نحو ٧–٨ دقائق. إجاباتكم محل تقدير، ولن تُربط بأسمائكم في التقارير العامة.</div>
      <div>
        <label for="name">الاسم</label>
        <input id="name" type="text" autocomplete="name" required maxlength="200">
        <div class="err" id="name-err" hidden>يرجى إدخال الاسم</div>
      </div>
      <div>
        <label for="email">البريد الإلكتروني</label>
        <input id="email" type="email" autocomplete="email" required maxlength="320">
        <div class="err" id="email-err" hidden>يرجى إدخال بريد إلكتروني صحيح</div>
      </div>
      <div>
        <button id="start-btn" class="btn-primary" type="button">بدء الاستبيان ←</button>
      </div>
    </section>

    <!-- Survey state -->
    <section id="survey" hidden>
      <div class="progress-bar">
        <div class="track"><div class="fill" id="progress-fill"></div></div>
        <span class="count" id="progress-count">٠ من ٣٠ سؤال</span>
      </div>
      <div id="sections"></div>
      <div class="submit-row">
        <button id="submit-btn" class="btn-primary" type="button" disabled>إرسال الاستبيان</button>
        <p style="font-size:13px;color:var(--text-muted);margin:0">لكم جزيل الشكر على مشاركتكم.</p>
      </div>
    </section>
  </main>

  <div id="duplicate-modal" class="modal-backdrop" hidden>
    <div class="modal">
      <h3>تنبيه</h3>
      <p>لاحظنا أنه سبق إرسال استبيان بهذا البريد الإلكتروني. هل ترغبون في إرسال هذه الإجابات الجديدة على أي حال؟</p>
      <div class="actions">
        <button id="dup-confirm" class="btn-primary">نعم، أرسلوا</button>
        <button id="dup-cancel" class="btn-outline">إلغاء</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast" hidden></div>

  <script type="module" src="/js/survey.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat(ui): survey HTML — gate + survey shell + duplicate modal"
```

---

### Task 13: Survey JS — full interactive logic

**Files:**
- Create: `public/js/survey.js`

- [ ] **Step 1: Implement**

```javascript
// public/js/survey.js
import { apiFetch, loadQuestions } from './shared/api.js';
import { toArDigits, LIKERT_ORDER, LIKERT_LABELS } from './shared/i18n.js';

const DRAFT_KEY = 'training-survey-draft-v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const state = {
  schema: null,
  respondent: { name: '', email: '' },
  answers: {},
  totalRequired: 0,
};

const el = {
  gate:           document.getElementById('gate'),
  survey:         document.getElementById('survey'),
  nameInput:      document.getElementById('name'),
  emailInput:     document.getElementById('email'),
  nameErr:        document.getElementById('name-err'),
  emailErr:       document.getElementById('email-err'),
  startBtn:       document.getElementById('start-btn'),
  sectionsEl:     document.getElementById('sections'),
  progressFill:   document.getElementById('progress-fill'),
  progressCount:  document.getElementById('progress-count'),
  submitBtn:      document.getElementById('submit-btn'),
  dupModal:       document.getElementById('duplicate-modal'),
  dupConfirm:     document.getElementById('dup-confirm'),
  dupCancel:      document.getElementById('dup-cancel'),
  toast:          document.getElementById('toast'),
};

function showToast(msg, type = 'error') {
  el.toast.textContent = msg;
  el.toast.className = `toast ${type === 'success' ? 'success' : ''}`;
  el.toast.hidden = false;
  setTimeout(() => { el.toast.hidden = true; }, 4000);
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    respondent: state.respondent, answers: state.answers, ts: Date.now(),
  }));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

function flatQuestions() {
  return state.schema.sections.flatMap(s => s.questions);
}

function renderStars(q) {
  const current = state.answers[q.id];
  const buttons = [];
  for (let i = 5; i >= 1; i--) { // RTL: visual order
    buttons.push(`<button type="button" role="radio" aria-checked="${current === i}" data-val="${i}" aria-label="${i} من ٥">★</button>`);
  }
  return `<div class="stars" role="radiogroup" aria-label="${q.label}" data-q="${q.id}">${buttons.join('')}</div>`;
}

function renderLikert(q) {
  const current = state.answers[q.id];
  const buttons = LIKERT_ORDER.map(v =>
    `<button type="button" role="radio" aria-checked="${current === v}" data-val="${v}">${LIKERT_LABELS[v]}</button>`
  ).join('');
  return `<div class="likert" role="radiogroup" aria-label="${q.label}" data-q="${q.id}">${buttons}</div>`;
}

function renderNps(q) {
  const current = state.answers[q.id];
  const buttons = [];
  for (let i = 10; i >= 0; i--) {
    buttons.push(`<button type="button" role="radio" aria-checked="${current === i}" data-val="${i}">${toArDigits(i)}</button>`);
  }
  return `
    <div class="nps" role="radiogroup" aria-label="${q.label}" data-q="${q.id}">${buttons.join('')}</div>
    <div class="legend"><span>أوصي بشدة (١٠)</span><span>لا أوصي إطلاقاً (٠)</span></div>
  `;
}

function renderTextarea(q) {
  const current = state.answers[q.id] || '';
  const max = q.maxLength || 2000;
  return `
    <textarea data-q="${q.id}" maxlength="${max}" rows="4">${current.replace(/</g, '&lt;')}</textarea>
    <div class="charcount"><span data-count="${q.id}">${toArDigits(current.length)}</span> / ${toArDigits(max)}</div>
  `;
}

function renderQuestion(q) {
  let widget = '';
  if (q.type === 'stars')    widget = renderStars(q);
  else if (q.type === 'likert')  widget = renderLikert(q);
  else if (q.type === 'nps')     widget = renderNps(q);
  else if (q.type === 'textarea') widget = renderTextarea(q);

  const required = q.required ? '<span class="required" aria-hidden="true">*</span>' : '';
  return `
    <div class="q-row" data-qrow="${q.id}">
      <div class="label">${q.label}${required}</div>
      ${widget}
    </div>
  `;
}

function renderSurvey() {
  el.sectionsEl.innerHTML = state.schema.sections.map(sec => `
    <section class="section">
      <h2>${sec.title}</h2>
      ${sec.questions.map(renderQuestion).join('')}
    </section>
  `).join('');
}

function updateProgress() {
  const required = flatQuestions().filter(q => q.required);
  const filled = required.filter(q => {
    const v = state.answers[q.id];
    return v !== undefined && v !== null && v !== '';
  }).length;
  const pct = (filled / Math.max(required.length, 1)) * 100;
  el.progressFill.style.width = `${pct}%`;
  el.progressCount.textContent = `${toArDigits(filled)} من ${toArDigits(required.length)} سؤال`;
  el.submitBtn.disabled = filled !== required.length;
}

function setAnswer(qid, value) {
  state.answers[qid] = value;
  // Update aria-checked
  document.querySelectorAll(`[data-q="${qid}"] [data-val]`).forEach(b => {
    const v = b.dataset.val;
    const eq = (b.dataset.val == String(value)); // loose equality intentional (numbers as strings)
    b.setAttribute('aria-checked', eq ? 'true' : 'false');
  });
  saveDraft();
  updateProgress();
}

function setText(qid, value) {
  state.answers[qid] = value;
  const counter = document.querySelector(`[data-count="${qid}"]`);
  if (counter) counter.textContent = toArDigits(value.length);
  saveDraft();
  updateProgress();
}

function attachQuestionHandlers() {
  el.sectionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-val]');
    if (!btn) return;
    const group = btn.closest('[data-q]');
    if (!group) return;
    const qid = group.dataset.q;
    const q = flatQuestions().find(qq => qq.id === qid);
    let val = btn.dataset.val;
    if (q?.type === 'stars' || q?.type === 'nps') val = Number(val);
    setAnswer(qid, val);
  });

  el.sectionsEl.addEventListener('input', (e) => {
    const ta = e.target.closest('textarea[data-q]');
    if (!ta) return;
    setText(ta.dataset.q, ta.value);
  });

  // Keyboard: arrow keys within radiogroup
  el.sectionsEl.addEventListener('keydown', (e) => {
    const group = e.target.closest('[role="radiogroup"]');
    if (!group) return;
    const buttons = [...group.querySelectorAll('[data-val]')];
    const idx = buttons.indexOf(document.activeElement);
    if (idx === -1) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')     { buttons[Math.min(idx + 1, buttons.length - 1)]?.focus(); e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { buttons[Math.max(idx - 1, 0)]?.focus(); e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter')               { document.activeElement.click(); e.preventDefault(); }
  });
}

function validateGate() {
  const name = el.nameInput.value.trim();
  const email = el.emailInput.value.trim().toLowerCase();
  let ok = true;
  if (!name) { el.nameErr.hidden = false; el.nameInput.classList.add('invalid'); ok = false; }
  else      { el.nameErr.hidden = true;  el.nameInput.classList.remove('invalid'); }
  if (!EMAIL_RE.test(email)) { el.emailErr.hidden = false; el.emailInput.classList.add('invalid'); ok = false; }
  else                       { el.emailErr.hidden = true;  el.emailInput.classList.remove('invalid'); }
  return ok ? { name, email } : null;
}

function startSurvey(respondent) {
  state.respondent = respondent;
  el.gate.hidden = true;
  el.survey.hidden = false;
  renderSurvey();
  attachQuestionHandlers();
  updateProgress();
  saveDraft();
}

async function submit(confirmDuplicate = false) {
  // Find first missing required and scroll to it
  const missing = flatQuestions().find(q => q.required && (state.answers[q.id] == null || state.answers[q.id] === ''));
  if (missing) {
    document.querySelector(`[data-qrow="${missing.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('يرجى الإجابة على جميع الأسئلة المطلوبة');
    return;
  }

  el.submitBtn.classList.add('loading'); el.submitBtn.disabled = true;
  try {
    const data = await apiFetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify({
        name: state.respondent.name,
        email: state.respondent.email,
        answers: state.answers,
        questionsVersion: state.schema.version,
        confirmDuplicate,
      }),
    });
    if (data.requiresConfirmation) {
      el.submitBtn.classList.remove('loading'); el.submitBtn.disabled = false;
      el.dupModal.hidden = false;
      return;
    }
    clearDraft();
    window.location.href = '/thanks';
  } catch (err) {
    el.submitBtn.classList.remove('loading'); el.submitBtn.disabled = false;
    showToast('تعذّر الإرسال — يرجى المحاولة مرة أخرى');
  }
}

function init() {
  el.startBtn.addEventListener('click', async () => {
    const r = validateGate();
    if (!r) return;

    if (!state.schema) {
      try { state.schema = await loadQuestions(); }
      catch { showToast('تعذّر تحميل الاستبيان — يرجى إعادة تحميل الصفحة'); return; }
    }

    const draft = loadDraft();
    if (draft && draft.respondent?.email === r.email) {
      state.answers = draft.answers || {};
    }
    startSurvey(r);
  });

  el.submitBtn.addEventListener('click', () => submit(false));
  el.dupConfirm.addEventListener('click', () => { el.dupModal.hidden = true; submit(true); });
  el.dupCancel.addEventListener('click', () => { el.dupModal.hidden = true; });
}

init();
```

- [ ] **Step 2: Commit**

```bash
git add public/js/survey.js
git commit -m "feat(ui): survey JS — render, validate, draft auto-save, submit, duplicate flow"
```

---

### Task 14: Thanks page

**Files:**
- Create: `public/thanks.html`

- [ ] **Step 1: Implement**

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>شكراً لكم</title>
  <link rel="stylesheet" href="/css/survey.css">
</head>
<body>
  <main>
    <section class="thanks">
      <div class="icon">✓</div>
      <h1>شكراً جزيلاً لإجاباتكم</h1>
      <p>ملاحظاتكم ستسهم في تطوير برامجنا التدريبية القادمة. لكم جزيل الشكر على وقتكم.</p>
    </section>
  </main>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/thanks.html
git commit -m "feat(ui): post-submission thanks page"
```

---

## Phase 5 — Admin auth

### Task 15: Rate-limit helper + admin-login function

**Files:**
- Create: `netlify/functions/_shared/ratelimit.js`
- Create: `netlify/functions/admin-login.js`

- [ ] **Step 1: Implement `ratelimit.js`**

```javascript
// netlify/functions/_shared/ratelimit.js
import crypto from 'node:crypto';
import { rateLimitStore } from './blobs.js';

const WINDOW_MS = 5 * 60 * 1000;     // 5 min observation window
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 10 * 60 * 1000;     // 10 min block

function ipHash(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 32);
}

/**
 * Returns { ok: true } if request is allowed, or { ok: false, retryAfter } if blocked.
 * Call recordFailure() after a failed login attempt.
 */
export async function checkRateLimit(ip) {
  const store = rateLimitStore();
  const key = ipHash(ip);
  const now = Date.now();
  const rec = (await store.get(key, { type: 'json' })) || null;

  if (!rec) return { ok: true };

  if (rec.blockedUntil && rec.blockedUntil > now) {
    return { ok: false, retryAfter: Math.ceil((rec.blockedUntil - now) / 1000) };
  }

  // Window expired? Reset
  if (now - rec.firstAttemptAt > WINDOW_MS) {
    await store.delete(key);
    return { ok: true };
  }
  return { ok: true };
}

export async function recordFailure(ip) {
  const store = rateLimitStore();
  const key = ipHash(ip);
  const now = Date.now();
  const rec = (await store.get(key, { type: 'json' })) || { count: 0, firstAttemptAt: now };

  if (now - rec.firstAttemptAt > WINDOW_MS) {
    rec.count = 1; rec.firstAttemptAt = now; rec.blockedUntil = null;
  } else {
    rec.count++;
    if (rec.count >= MAX_ATTEMPTS) rec.blockedUntil = now + BLOCK_MS;
  }
  await store.setJSON(key, rec);
}

export async function clearRateLimit(ip) {
  await rateLimitStore().delete(ipHash(ip));
}
```

- [ ] **Step 2: Implement `admin-login.js`**

```javascript
// netlify/functions/admin-login.js
import { signSession, timingSafeStringEqual } from './_shared/auth.js';
import { checkRateLimit, recordFailure, clearRateLimit } from './_shared/ratelimit.js';

const SESSION_TTL = 4 * 60 * 60; // 4h

function clientIp(req) {
  return req.headers.get('x-nf-client-connection-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown';
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const ip = clientIp(req);
  const limit = await checkRateLimit(ip);
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfter) },
    });
  }

  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const { username = '', password = '' } = body;

  const okUser = timingSafeStringEqual(username, process.env.ADMIN_USERNAME || '');
  const okPass = timingSafeStringEqual(password, process.env.ADMIN_PASSWORD || '');
  if (!okUser || !okPass) {
    await recordFailure(ip);
    return new Response(JSON.stringify({ error: 'invalid_credentials' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  await clearRateLimit(ip);
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (!secret) return new Response('Server misconfig', { status: 500 });

  const cookie = signSession({ u: process.env.ADMIN_USERNAME }, secret, SESSION_TTL);
  const cookieStr = `admin_session=${cookie}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}`;
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr },
  });
};

export const config = { path: '/api/admin/login' };
```

- [ ] **Step 3: Implement `admin-logout.js`**

```javascript
// netlify/functions/admin-logout.js
export default async () => {
  const cookieStr = 'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr },
  });
};

export const config = { path: '/api/admin/logout' };
```

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/_shared/ratelimit.js netlify/functions/admin-login.js netlify/functions/admin-logout.js
git commit -m "feat(api): admin login/logout with rate limiting + HMAC cookie"
```

---

### Task 16: Admin login HTML + JS

**Files:**
- Create: `public/admin-login.html`
- Create: `public/js/admin-login.js`

- [ ] **Step 1: Implement `admin-login.html`**

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>تسجيل دخول المسؤول</title>
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body class="admin-login-body">
  <main class="login-card">
    <h1>تسجيل دخول المسؤول</h1>
    <p class="subtitle">لوحة تحكم استبيان التدريب</p>
    <form id="login-form" autocomplete="off">
      <label for="u">اسم المستخدم</label>
      <input id="u" type="text" required>
      <label for="p">كلمة المرور</label>
      <input id="p" type="password" required>
      <button type="submit" class="btn-primary" id="submit-btn">تسجيل الدخول</button>
      <div class="err" id="err" hidden></div>
    </form>
  </main>
  <script type="module" src="/js/admin-login.js"></script>
</body>
</html>
```

- [ ] **Step 2: Implement `admin-login.js`**

```javascript
// public/js/admin-login.js
import { apiFetch } from './shared/api.js';

const form    = document.getElementById('login-form');
const u       = document.getElementById('u');
const p       = document.getElementById('p');
const err     = document.getElementById('err');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.hidden = true;
  submitBtn.disabled = true; submitBtn.classList.add('loading');
  try {
    await apiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: u.value, password: p.value }),
    });
    window.location.href = '/admin';
  } catch (ex) {
    submitBtn.disabled = false; submitBtn.classList.remove('loading');
    if (ex.status === 429) {
      err.textContent = 'محاولات تسجيل دخول متعدّدة. يرجى المحاولة بعد ١٠ دقائق.';
    } else {
      err.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
    err.hidden = false;
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add public/admin-login.html public/js/admin-login.js
git commit -m "feat(ui): admin login page + JS"
```

---

## Phase 6 — Admin dashboard backend

### Task 17: Stats endpoint

**Files:**
- Create: `netlify/functions/admin-stats.js`

- [ ] **Step 1: Implement**

```javascript
// netlify/functions/admin-stats.js
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifySession } from './_shared/auth.js';
import { listAllResponses } from './_shared/blobs.js';
import { computeStats } from './_shared/stats.js';

function getCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}

let cachedSchema = null;
async function getSchema() {
  if (cachedSchema) return cachedSchema;
  // Functions run from netlify/functions/. questions.json is in public/.
  const filePath = path.join(process.cwd(), 'public', 'questions.json');
  const text = await readFile(filePath, 'utf8');
  cachedSchema = JSON.parse(text);
  return cachedSchema;
}

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const cookie = getCookie(req, 'admin_session');
  const session = verifySession(cookie, process.env.ADMIN_SESSION_SECRET || '');
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const opts = {
    from: url.searchParams.get('from') || undefined,
    to:   url.searchParams.get('to')   || undefined,
    includeDuplicates: url.searchParams.get('includeDuplicates') === 'true',
  };

  const [schema, responses] = await Promise.all([getSchema(), listAllResponses()]);
  const stats = computeStats(schema, responses, opts);
  return new Response(JSON.stringify(stats), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/admin/stats' };
```

- [ ] **Step 2: Commit**

```bash
git add netlify/functions/admin-stats.js
git commit -m "feat(api): GET /api/admin/stats — auth-gated aggregated dashboard data"
```

---

### Task 18: Respondents list endpoint

**Files:**
- Create: `netlify/functions/admin-responses.js`

- [ ] **Step 1: Implement**

```javascript
// netlify/functions/admin-responses.js
import { verifySession } from './_shared/auth.js';
import { listAllResponses } from './_shared/blobs.js';

function getCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const session = verifySession(getCookie(req, 'admin_session'), process.env.ADMIN_SESSION_SECRET || '');
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to   = url.searchParams.get('to');
  const includeDuplicates = url.searchParams.get('includeDuplicates') === 'true';

  const all = await listAllResponses();
  const list = all
    .filter(r => {
      if (!includeDuplicates && r.isDuplicate) return false;
      const t = Date.parse(r.submittedAt);
      if (from && t < Date.parse(from)) return false;
      if (to   && t > Date.parse(to))   return false;
      return true;
    })
    .map(r => ({
      responseId: r.responseId,
      submittedAt: r.submittedAt,
      name: r.respondent?.name,
      email: r.respondent?.email,
      isDuplicate: !!r.isDuplicate,
      submissionCountForEmail: r.submissionCountForEmail || 1,
    }));

  return new Response(JSON.stringify({ count: list.length, respondents: list }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/admin/responses' };
```

- [ ] **Step 2: Commit**

```bash
git add netlify/functions/admin-responses.js
git commit -m "feat(api): GET /api/admin/responses — respondent list (no answers in payload)"
```

---

### Task 19: Export endpoint

**Files:**
- Create: `netlify/functions/admin-export.js`

- [ ] **Step 1: Implement**

```javascript
// netlify/functions/admin-export.js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { verifySession } from './_shared/auth.js';
import { listAllResponses } from './_shared/blobs.js';
import { responsesToCSV } from './_shared/csv.js';

function getCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v || '');
  }
  return null;
}

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const session = verifySession(getCookie(req, 'admin_session'), process.env.ADMIN_SESSION_SECRET || '');
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  const from = url.searchParams.get('from');
  const to   = url.searchParams.get('to');
  const includeDuplicates = url.searchParams.get('includeDuplicates') === 'true';

  const all = await listAllResponses();
  const filtered = all.filter(r => {
    if (!includeDuplicates && r.isDuplicate) return false;
    const t = Date.parse(r.submittedAt);
    if (from && t < Date.parse(from)) return false;
    if (to   && t > Date.parse(to))   return false;
    return true;
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'csv') {
    const schemaText = await readFile(path.join(process.cwd(), 'public', 'questions.json'), 'utf8');
    const schema = JSON.parse(schemaText);
    const csv = responsesToCSV(schema, filtered);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="training-survey-${stamp}.csv"`,
      },
    });
  }

  const json = JSON.stringify({
    exportedAt: new Date().toISOString(),
    questionsVersion: filtered[0]?.questionsVersion || 1,
    responseCount: filtered.length,
    responses: filtered,
  }, null, 2);

  return new Response(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="training-survey-${stamp}.json"`,
    },
  });
};

export const config = { path: '/api/admin/export' };
```

- [ ] **Step 2: Commit**

```bash
git add netlify/functions/admin-export.js
git commit -m "feat(api): GET /api/admin/export — JSON + CSV download"
```

---

## Phase 7 — Admin dashboard frontend

### Task 20: Admin CSS (glassmorphism bento dark)

**Files:**
- Create: `public/css/admin.css`

- [ ] **Step 1: Implement**

```css
/* public/css/admin.css */
@font-face {
  font-family: 'DINNext';
  src: url('/fonts/DINNext/DINNextLTArabic-Regular.woff') format('woff'),
       url('/fonts/DINNext/DINNextLTArabic-Regular.ttf')  format('truetype');
  font-display: swap;
}

:root {
  --bg: #0a0e14;
  --tile-bg: #161b22;
  --tile-border: #21262d;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --text-dim: #6e7681;
  --accent-green: #019443;
  --accent-green-glow: #4ade80;
  --accent-gold: #E9B90F;
  --accent-gold-glow: #facc15;
  --danger: #ef4444;
  --warn: #f59e0b;
  --ok: #4ade80;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); }
body {
  font-family: 'DINNext', 'Segoe UI', Tahoma, sans-serif; font-size: 14px;
  -webkit-font-smoothing: antialiased; min-height: 100vh;
}

.admin-shell { padding: 20px 28px; }

/* Top bar */
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 18px; flex-direction: row-reverse;
}
.topbar h1 { font-size: 18px; margin: 0; color: var(--text); }
.topbar .actions { display: flex; gap: 10px; align-items: center; flex-direction: row-reverse; }

.filter-select, .btn-outline-admin {
  background: var(--tile-bg); color: var(--text); border: 1px solid var(--tile-border);
  border-radius: 6px; padding: 8px 12px; font-family: inherit; font-size: 13px; cursor: pointer;
}
.filter-select option { background: var(--tile-bg); }
.btn-outline-admin:hover { border-color: var(--accent-green); }
.btn-icon { background: transparent; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px; padding: 4px 8px; }

/* Bento grid */
.bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 14px; }
.tile {
  background: var(--tile-bg);
  border: 1px solid var(--tile-border);
  border-radius: 14px;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px) saturate(140%);
}
.tile h3 { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; font-weight: 600; }

/* Accent variants */
.tile.accent-green { background: linear-gradient(135deg, rgba(1,148,67,0.12), var(--tile-bg) 70%); border-color: rgba(1,148,67,0.4); }
.tile.accent-green .val { color: var(--accent-green-glow); }
.tile.accent-gold  { background: linear-gradient(135deg, rgba(233,185,15,0.12), var(--tile-bg) 70%); border-color: rgba(233,185,15,0.4); }
.tile.accent-gold .val  { color: var(--accent-gold-glow); }

/* KPI tile */
.kpi { grid-column: span 3; }
.kpi .val { font-size: 32px; font-weight: 800; color: var(--text); line-height: 1; }
.kpi .sub { font-size: 11px; color: var(--text-dim); margin-top: 4px; }

/* Insight tiles (top/bottom) */
.insight { grid-column: span 6; }
.insight ul { list-style: none; padding: 0; margin: 8px 0 0 0; }
.insight li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--tile-border); font-size: 13px; flex-direction: row-reverse; }
.insight li:last-child { border-bottom: 0; }
.insight .score { font-weight: 700; }
.insight.top .score { color: var(--ok); }
.insight.bottom .score { color: var(--danger); }

/* Full width */
.full { grid-column: 1 / -1; }
.half { grid-column: span 6; }

/* Category bar chart */
.cat-bar { display: flex; align-items: center; gap: 12px; padding: 6px 0; flex-direction: row-reverse; }
.cat-bar .name { width: 200px; font-size: 13px; color: var(--text); }
.cat-bar .track { flex: 1; height: 10px; background: var(--tile-border); border-radius: 5px; overflow: hidden; }
.cat-bar .fill { height: 100%; border-radius: 5px; }
.cat-bar .score { width: 40px; text-align: end; font-weight: 700; font-size: 13px; }
.fill.bar-low  { background: var(--danger); }
.fill.bar-mid  { background: var(--warn); }
.fill.bar-high { background: var(--ok); }

/* Question breakdown */
.q-breakdown details { background: rgba(255,255,255,0.02); border-radius: 8px; padding: 8px 12px; margin-bottom: 6px; }
.q-breakdown summary { cursor: pointer; font-weight: 600; color: var(--accent-green-glow); list-style: none; }
.q-breakdown summary::-webkit-details-marker { display: none; }
.q-breakdown summary::before { content: '◀ '; font-size: 10px; color: var(--text-muted); transition: transform 0.15s; display: inline-block; }
.q-breakdown details[open] summary::before { transform: rotate(-90deg); }
.q-detail { padding: 8px 0 0 0; }
.q-row-stat { display: flex; gap: 10px; align-items: center; padding: 6px 0; font-size: 13px; flex-direction: row-reverse; }
.q-row-stat .lbl { flex: 1; color: var(--text); }
.q-row-stat .avg { font-weight: 700; min-width: 36px; text-align: end; }
.q-row-stat .dist { display: inline-flex; gap: 2px; }
.q-row-stat .dist span { display: inline-block; height: 10px; min-width: 6px; border-radius: 1px; background: var(--accent-green-glow); }

/* Likert bar */
.likert-bar { display: flex; height: 16px; border-radius: 4px; overflow: hidden; margin-top: 6px; }
.likert-bar span { display: block; }

/* Text responses panel */
.text-panel input.search { width: 100%; padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--tile-border); color: var(--text); border-radius: 6px; font-family: inherit; }
.text-panel .filter { display: flex; gap: 8px; margin: 8px 0; flex-direction: row-reverse; align-items: center; flex-wrap: wrap; }
.text-list { max-height: 300px; overflow-y: auto; margin-top: 8px; }
.text-item { padding: 8px 10px; border-bottom: 1px dashed var(--tile-border); font-size: 13px; line-height: 1.6; }
.text-item .tag { font-size: 10px; color: var(--accent-gold-glow); margin-inline-end: 6px; }

/* Word cloud */
.word-cloud { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-items: center; min-height: 200px; padding: 10px; }
.word-cloud span { padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: transform 0.15s; background: rgba(1,148,67,0.08); color: var(--text); }
.word-cloud span:hover { transform: scale(1.1); background: rgba(1,148,67,0.2); }

/* Respondent table */
.resp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.resp-table thead { position: sticky; top: 0; background: var(--tile-bg); }
.resp-table th, .resp-table td { padding: 8px 10px; text-align: start; border-bottom: 1px dashed var(--tile-border); }
.resp-table th { color: var(--text-muted); font-weight: 600; }
.resp-table tr.dup td { color: var(--accent-gold-glow); }

/* SVG charts container */
.chart-container svg { width: 100%; max-width: 100%; display: block; }

/* Footer actions */
.footer-actions { display: flex; gap: 12px; justify-content: center; padding: 24px 0; flex-direction: row-reverse; flex-wrap: wrap; }
.btn-export {
  background: linear-gradient(135deg, var(--accent-green), var(--accent-green-glow));
  color: #fff; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer;
  font-family: inherit; font-weight: 600;
}
.btn-export.gold { background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-glow)); }
.btn-export.outline { background: transparent; border: 1px solid var(--tile-border); color: var(--text); }

/* Empty state */
.empty-state { text-align: center; padding: 80px 20px; color: var(--text-muted); }
.empty-state .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }

/* Loading */
.loading-state { text-align: center; padding: 80px 20px; color: var(--text-muted); }

/* Login page (admin-login.html) */
.admin-login-body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
.login-card { background: var(--tile-bg); border: 1px solid var(--tile-border); border-radius: 14px; padding: 32px; width: 100%; max-width: 380px; }
.login-card h1 { margin: 0 0 4px; font-size: 20px; color: var(--accent-green-glow); }
.login-card .subtitle { color: var(--text-muted); font-size: 13px; margin: 0 0 24px; }
.login-card label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 4px; margin-top: 12px; color: var(--text-muted); }
.login-card input { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--tile-border); color: var(--text); border-radius: 6px; font-family: inherit; font-size: 14px; }
.login-card input:focus { outline: 2px solid var(--accent-green); }
.login-card .btn-primary {
  width: 100%; margin-top: 18px; padding: 12px; background: var(--accent-gold); color: #fff;
  border: none; border-radius: 6px; font-family: inherit; font-weight: 700; font-size: 14px; cursor: pointer;
  transition: filter 0.15s ease;
}
.login-card .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.login-card .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.login-card .btn-primary.loading { color: transparent; position: relative; }
.login-card .btn-primary.loading::after {
  content: ''; position: absolute; inset: 0; margin: auto; width: 18px; height: 18px;
  border: 3px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.login-card .err { color: var(--danger); font-size: 13px; margin-top: 10px; padding: 8px 12px; background: rgba(239,68,68,0.08); border-radius: 6px; }

/* Responsive */
@media (max-width: 900px) {
  .kpi { grid-column: span 6; }
  .insight, .half { grid-column: 1 / -1; }
}
@media (max-width: 600px) {
  .admin-shell { padding: 12px; }
  .kpi { grid-column: 1 / -1; }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/css/admin.css
git commit -m "feat(ui): admin CSS — glassmorphism bento dark theme, Wilayah accents"
```

---

### Task 21: Admin chart helpers (SVG)

**Files:**
- Create: `public/js/admin-charts.js`

- [ ] **Step 1: Implement**

```javascript
// public/js/admin-charts.js
// Minimal SVG chart helpers, no external libs.

const COLORS = {
  low: '#ef4444', mid: '#f59e0b', high: '#4ade80',
  green: '#019443', greenGlow: '#4ade80',
  gold: '#E9B90F', goldGlow: '#facc15',
  likert: ['#ef4444', '#f97316', '#a3a3a3', '#84cc16', '#4ade80'], // 5 stops
};

function classForAvg(avg) {
  if (avg == null) return 'bar-mid';
  if (avg < 3.0) return 'bar-low';
  if (avg < 3.7) return 'bar-mid';
  return 'bar-high';
}

/** Horizontal category bar chart (one row per category). */
export function renderCategoryBars(container, categories) {
  container.innerHTML = categories.map(c => {
    const pct = ((c.avg || 0) / 5) * 100;
    return `
      <div class="cat-bar">
        <span class="score">${(c.avg ?? 0).toFixed(1)}</span>
        <div class="track"><div class="fill ${classForAvg(c.avg)}" style="width:${pct}%"></div></div>
        <span class="name">${escapeHtml(c.title)}</span>
      </div>
    `;
  }).join('');
}

/** Likert distribution as a stacked horizontal bar. */
export function renderLikertBar(container, dist) {
  const order = ['strongly_disagree', 'disagree', 'neutral', 'agree', 'strongly_agree'];
  const total = order.reduce((s, k) => s + (dist[k] || 0), 0);
  if (total === 0) { container.innerHTML = '<div style="color:#6e7681;font-size:12px">لا توجد إجابات</div>'; return; }
  container.innerHTML = `
    <div class="likert-bar">
      ${order.map((k, i) => {
        const pct = ((dist[k] || 0) / total) * 100;
        if (pct === 0) return '';
        return `<span style="width:${pct}%;background:${COLORS.likert[i]}" title="${k}: ${dist[k]}"></span>`;
      }).join('')}
    </div>
  `;
}

/** Distribution mini-bar for a star question (5 bars side-by-side). */
export function renderStarsMini(dist) {
  const max = Math.max(...Object.values(dist), 1);
  return `<span class="dist" title="${Object.entries(dist).map(([k,v]) => `${k}★: ${v}`).join(' | ')}">
    ${['1','2','3','4','5'].map(k => {
      const h = Math.max(2, ((dist[k] || 0) / max) * 12);
      return `<span style="height:${h}px"></span>`;
    }).join('')}
  </span>`;
}

/** SVG line chart for time trend. */
export function renderTimeTrend(container, points) {
  if (!points.length) { container.innerHTML = '<div class="empty-state">لا توجد بيانات</div>'; return; }
  const W = 560, H = 180, P = 24;
  const maxC = Math.max(...points.map(p => p.count), 1);
  const stepX = (W - 2 * P) / Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = P + i * stepX;
    const y = H - P - (p.count / maxC) * (H - 2 * P);
    return [x, y];
  });
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(' ');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-label="الردود مع الوقت">
      <path d="${pathD}" fill="none" stroke="${COLORS.greenGlow}" stroke-width="2" />
      ${coords.map((c, i) => `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3" fill="${COLORS.gold}" />`).join('')}
      <text x="${P}" y="${H - 4}" fill="#6e7681" font-size="10">${escapeHtml(points[0].date)}</text>
      <text x="${W - P}" y="${H - 4}" fill="#6e7681" font-size="10" text-anchor="end">${escapeHtml(points[points.length - 1].date)}</text>
    </svg>
  `;
}

/** Render word cloud as resized HTML spans. */
export function renderWordCloud(container, words, onClick) {
  if (!words.length) { container.innerHTML = '<div class="empty-state">لا توجد بيانات نصية</div>'; return; }
  const maxC = Math.max(...words.map(w => w.count), 1);
  container.innerHTML = words.map(w => {
    const fontSize = 12 + Math.log(w.count + 1) / Math.log(maxC + 1) * 24;
    return `<span data-word="${escapeAttr(w.word)}" style="font-size:${fontSize.toFixed(1)}px">${escapeHtml(w.word)}</span>`;
  }).join('');
  if (onClick) {
    container.addEventListener('click', e => {
      const sp = e.target.closest('[data-word]');
      if (sp) onClick(sp.dataset.word);
    });
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
```

- [ ] **Step 2: Commit**

```bash
git add public/js/admin-charts.js
git commit -m "feat(ui): SVG chart helpers — category bars, Likert stacked, line, word cloud"
```

---

### Task 22: Admin dashboard HTML

**Files:**
- Create: `public/admin.html`

- [ ] **Step 1: Implement**

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>لوحة تحكم استبيان التدريب</title>
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
  <main class="admin-shell">
    <header class="topbar">
      <div class="actions">
        <select id="filter-range" class="filter-select" aria-label="النطاق الزمني">
          <option value="all">جميع البيانات</option>
          <option value="today">اليوم</option>
          <option value="week">آخر ٧ أيام</option>
          <option value="month">آخر ٣٠ يوم</option>
        </select>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted)">
          <input type="checkbox" id="filter-duplicates"> تضمين المكرّرات
        </label>
        <button id="refresh-btn" class="btn-outline-admin" type="button">⟳ تحديث</button>
        <button id="logout-btn" class="btn-outline-admin" type="button">خروج</button>
      </div>
      <h1>لوحة تحكم استبيان تقييم التدريب على نظام Docsys</h1>
    </header>

    <div id="dashboard" class="bento" aria-live="polite">
      <div class="loading-state">جارٍ تحميل البيانات...</div>
    </div>

    <footer class="footer-actions" hidden id="footer">
      <a id="report-link" href="/admin/report" target="_blank" class="btn-export outline">🖨️ تقرير قابل للطباعة</a>
      <button id="export-csv" class="btn-export gold" type="button">⬇ تنزيل CSV</button>
      <button id="export-json" class="btn-export" type="button">⬇ تنزيل JSON</button>
    </footer>
  </main>

  <script type="module" src="/js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/admin.html
git commit -m "feat(ui): admin dashboard HTML shell with filters and footer actions"
```

---

### Task 23: Admin dashboard JS — fetch + render

**Files:**
- Create: `public/js/admin.js`

- [ ] **Step 1: Implement**

```javascript
// public/js/admin.js
import { apiFetch } from './shared/api.js';
import {
  renderCategoryBars, renderLikertBar, renderStarsMini, renderTimeTrend, renderWordCloud,
} from './admin-charts.js';

let currentStats = null;
let filters = { range: 'all', includeDuplicates: false };
let respondents = [];

const $ = (sel) => document.querySelector(sel);

function buildQuery() {
  const params = new URLSearchParams();
  if (filters.includeDuplicates) params.set('includeDuplicates', 'true');
  const now = new Date();
  if (filters.range === 'today')   { const d = new Date(now); d.setHours(0,0,0,0); params.set('from', d.toISOString()); }
  if (filters.range === 'week')    { const d = new Date(now); d.setDate(d.getDate() - 7); params.set('from', d.toISOString()); }
  if (filters.range === 'month')   { const d = new Date(now); d.setDate(d.getDate() - 30); params.set('from', d.toISOString()); }
  return params.toString();
}

async function loadAll() {
  const dashboard = $('#dashboard');
  dashboard.innerHTML = '<div class="loading-state">جارٍ تحميل البيانات...</div>';

  let stats, listData;
  try {
    const q = buildQuery();
    [stats, listData] = await Promise.all([
      apiFetch(`/api/admin/stats?${q}`),
      apiFetch(`/api/admin/responses?${q}`),
    ]);
  } catch (err) {
    if (err.status === 401) { window.location.href = '/admin-login'; return; }
    dashboard.innerHTML = '<div class="empty-state"><div class="icon">⚠</div>تعذّر تحميل البيانات</div>';
    return;
  }
  currentStats = stats;
  respondents = listData.respondents;

  if (stats.kpis.totalResponses === 0) {
    dashboard.innerHTML = '<div class="empty-state full"><div class="icon">📭</div>لم تصلنا أي ردود بعد. ستظهر البيانات هنا فور وصول أول رد.</div>';
    $('#footer').hidden = false;
    return;
  }

  renderDashboard(stats);
  $('#footer').hidden = false;
}

function renderDashboard(stats) {
  const html = `
    ${renderKpis(stats.kpis)}
    ${renderInsights(stats.topRated, stats.bottomRated)}
    ${renderCategorySection(stats.categoryAverages)}
    ${renderQuestionBreakdown(stats.perQuestion, stats.categoryAverages)}
    ${renderLikertSection(stats.perQuestion)}
    ${renderQualitative(stats.textResponses, stats.wordCloud)}
    ${renderTimeAndRespondents(stats.timeTrend, respondents)}
  `;
  $('#dashboard').innerHTML = html;

  // Charts (post-DOM)
  renderCategoryBars($('#cat-bars'), stats.categoryAverages);
  const likertQuestions = stats.perQuestion.filter(q => q.type === 'likert');
  for (const q of likertQuestions) {
    const el = document.getElementById(`lk-${q.id}`);
    if (el) renderLikertBar(el, q.distribution);
  }
  renderTimeTrend($('#time-chart'), stats.timeTrend);
  renderWordCloud($('#word-cloud'), stats.wordCloud, (word) => filterTextByWord(word));
}

function renderKpis(k) {
  const fmt = (n) => n == null ? '—' : String(n);
  return `
    <div class="tile kpi accent-green"><h3>إجمالي الردود</h3><div class="val">${fmt(k.totalResponses)}</div></div>
    <div class="tile kpi"><h3>الفريد</h3><div class="val">${fmt(k.uniqueRespondents)}</div></div>
    <div class="tile kpi accent-gold"><h3>متوسط الرضا</h3><div class="val">${k.overallSatisfactionAvg ?? '—'}</div></div>
    <div class="tile kpi"><h3>NPS</h3><div class="val">${fmt(k.npsScore)}</div></div>
    <div class="tile kpi"><h3>معدّل الإتمام</h3><div class="val">${Math.round((k.completionRate || 0) * 100)}٪</div></div>
  `;
}

function renderInsights(top, bottom) {
  const renderList = (items) => items.map(i => `<li><span class="score">${i.avg.toFixed(1)}</span><span>${i.label}</span></li>`).join('');
  return `
    <div class="tile insight top"><h3>🌟 الأعلى تقييماً</h3><ul>${renderList(top)}</ul></div>
    <div class="tile insight bottom"><h3>⚠ بحاجة إلى تطوير</h3><ul>${renderList(bottom)}</ul></div>
  `;
}

function renderCategorySection() {
  return `<div class="tile full"><h3>متوسطات الأقسام</h3><div id="cat-bars"></div></div>`;
}

function renderQuestionBreakdown(perQ, categories) {
  const items = categories.map(cat => {
    const qs = perQ.filter(q => q.sectionId === cat.id && (q.type === 'stars' || q.type === 'likert' || q.type === 'nps'));
    return `
      <details open><summary>${cat.title} (${qs.length})</summary>
        <div class="q-detail">
          ${qs.map(q => {
            if (q.type === 'stars') return `<div class="q-row-stat"><span class="lbl">${q.label}</span>${renderStarsMini(q.distribution)}<span class="avg">${q.avg ?? '—'}</span></div>`;
            if (q.type === 'likert') return `<div class="q-row-stat"><span class="lbl">${q.label}</span><span class="avg">${q.avg ?? '—'}</span></div>`;
            if (q.type === 'nps') return `<div class="q-row-stat"><span class="lbl">${q.label}</span><span class="avg">NPS ${q.promoters - q.detractors >= 0 ? '+' : ''}${q.count ? Math.round(((q.promoters - q.detractors)/q.count)*100) : 0}</span></div>`;
          }).join('')}
        </div>
      </details>
    `;
  }).join('');
  return `<div class="tile full q-breakdown"><h3>تفاصيل الأسئلة</h3>${items}</div>`;
}

function renderLikertSection(perQ) {
  const likertQs = perQ.filter(q => q.type === 'likert');
  if (likertQs.length === 0) return '';
  return `<div class="tile full"><h3>توزيع الإجابات على عبارات الموافقة</h3>
    ${likertQs.map(q => `
      <div style="margin-bottom:14px">
        <div style="font-size:13px;margin-bottom:4px">${q.label}</div>
        <div id="lk-${q.id}"></div>
      </div>
    `).join('')}
  </div>`;
}

function renderQualitative(textResponses, _wordCloudData) {
  return `
    <div class="tile half"><h3>☁ السحابة الكلامية</h3><div id="word-cloud" class="word-cloud"></div></div>
    <div class="tile half text-panel"><h3>💬 الإجابات النصية</h3>
      <input class="search" id="text-search" placeholder="ابحث...">
      <div class="filter">
        ${textResponses.map((t, i) => `<button class="btn-outline-admin text-cat-btn" data-cat="${t.id}" ${i === 0 ? 'data-active="true"' : ''}>${t.label.slice(0, 30)}...</button>`).join('')}
      </div>
      <div id="text-list" class="text-list"></div>
    </div>
  `;
}

function renderTimeAndRespondents(_timeTrend, respList) {
  return `
    <div class="tile half"><h3>📈 الردود مع الوقت</h3><div id="time-chart" class="chart-container"></div></div>
    <div class="tile half">
      <h3>👥 قائمة المستجيبين (${respList.length})</h3>
      <div style="max-height:300px;overflow-y:auto">
        <table class="resp-table">
          <thead><tr><th>#</th><th>الاسم</th><th>البريد</th><th>التاريخ</th><th>📋</th></tr></thead>
          <tbody>
            ${respList.map((r, i) => `
              <tr class="${r.isDuplicate ? 'dup' : ''}">
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name)}</td>
                <td style="font-size:11px">${escapeHtml(r.email)}</td>
                <td style="font-size:11px">${new Date(r.submittedAt).toLocaleDateString('ar-SA')}</td>
                <td>${r.isDuplicate ? '🔁' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Text response filtering
let textState = { category: null, search: '', word: null };
function refreshTextList() {
  if (!currentStats) return;
  const cat = textState.category || currentStats.textResponses[0]?.id;
  const txt = currentStats.textResponses.find(t => t.id === cat);
  const list = $('#text-list');
  if (!txt) { list.innerHTML = ''; return; }
  let items = txt.responses;
  if (textState.search) items = items.filter(r => r.text.includes(textState.search));
  if (textState.word) items = items.filter(r => r.text.includes(textState.word));
  list.innerHTML = items.length
    ? items.map(r => `<div class="text-item"><span class="tag">${r.responseId.slice(-6)}</span>${escapeHtml(r.text)}</div>`).join('')
    : '<div class="empty-state" style="padding:20px">لا توجد نتائج</div>';
}

function filterTextByWord(word) {
  textState.word = textState.word === word ? null : word;
  refreshTextList();
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Wire up
document.addEventListener('change', (e) => {
  if (e.target.id === 'filter-range') { filters.range = e.target.value; loadAll(); }
  if (e.target.id === 'filter-duplicates') { filters.includeDuplicates = e.target.checked; loadAll(); }
});
document.addEventListener('click', async (e) => {
  if (e.target.id === 'refresh-btn') loadAll();
  if (e.target.id === 'logout-btn') {
    await apiFetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin-login';
  }
  if (e.target.id === 'export-json') downloadExport('json');
  if (e.target.id === 'export-csv')  downloadExport('csv');
  if (e.target.id === 'text-search') return;
  if (e.target.classList.contains('text-cat-btn')) {
    document.querySelectorAll('.text-cat-btn').forEach(b => b.removeAttribute('data-active'));
    e.target.setAttribute('data-active', 'true');
    textState.category = e.target.dataset.cat; textState.word = null;
    refreshTextList();
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'text-search') { textState.search = e.target.value; refreshTextList(); }
});

function downloadExport(format) {
  const q = new URLSearchParams(buildQuery());
  q.set('format', format);
  window.location.href = `/api/admin/export?${q.toString()}`;
}

// Init
loadAll();
```

- [ ] **Step 2: Commit**

```bash
git add public/js/admin.js
git commit -m "feat(ui): admin dashboard JS — fetch + bento render + filters + interactions"
```

---

## Phase 8 — Print-friendly report

### Task 24: Print report page + CSS

**Files:**
- Create: `public/admin-report.html`
- Create: `public/css/print.css`

- [ ] **Step 1: Create `print.css`**

```css
/* public/css/print.css */
@page { size: A4; margin: 16mm; }

body { background: #fff; color: #1f2937; font-family: 'DINNext', 'Segoe UI', Tahoma, sans-serif; }

.report-shell { max-width: 800px; margin: 0 auto; padding: 24px; }
.report-shell h1 { color: #019443; font-size: 22px; margin: 0 0 4px; }
.report-shell .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }

.report-section { margin-bottom: 24px; page-break-inside: avoid; }
.report-section h2 { color: #019443; border-bottom: 2px solid #E9B90F; padding-bottom: 6px; font-size: 17px; }
.report-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.report-kpi { padding: 10px; background: #f5f5f5; border-radius: 6px; text-align: center; }
.report-kpi .val { font-size: 22px; font-weight: 800; color: #019443; }
.report-kpi .lbl { font-size: 10px; color: #6b7280; }

.report-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-direction: row-reverse; }
.report-bar .name { flex: 1; font-size: 13px; }
.report-bar .track { width: 200px; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
.report-bar .fill { height: 100%; background: #019443; }
.report-bar .score { width: 36px; text-align: end; font-weight: 700; font-size: 12px; }

table.report-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
table.report-table th, table.report-table td { padding: 6px 8px; border: 1px solid #e0e0e0; text-align: start; }
table.report-table th { background: #019443; color: #fff; }

@media print {
  .no-print { display: none !important; }
}
```

- [ ] **Step 2: Create `admin-report.html`**

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>تقرير استبيان التدريب</title>
  <link rel="stylesheet" href="/css/print.css">
</head>
<body>
  <main class="report-shell" id="report-root">
    <div class="loading-state">جارٍ تحميل التقرير...</div>
  </main>
  <script type="module">
    import { apiFetch } from '/js/shared/api.js';

    const root = document.getElementById('report-root');
    const params = new URLSearchParams(window.location.search);

    function fmtPct(n) { return Math.round((n || 0) * 100) + '٪'; }

    async function load() {
      try {
        const stats = await apiFetch(`/api/admin/stats?${params.toString()}`);
        if (stats.kpis.totalResponses === 0) {
          root.innerHTML = '<h1>تقرير الاستبيان</h1><p>لا توجد ردود في هذا النطاق.</p>';
          return;
        }
        root.innerHTML = `
          <h1>تقرير استبيان تقييم البرنامج التدريبي على نظام Docsys</h1>
          <p class="meta">تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</p>
          <div class="report-section">
            <h2>المؤشرات الرئيسية</h2>
            <div class="report-kpis">
              <div class="report-kpi"><div class="val">${stats.kpis.totalResponses}</div><div class="lbl">إجمالي الردود</div></div>
              <div class="report-kpi"><div class="val">${stats.kpis.uniqueRespondents}</div><div class="lbl">المستجيبون الفريدون</div></div>
              <div class="report-kpi"><div class="val">${stats.kpis.overallSatisfactionAvg ?? '—'}</div><div class="lbl">متوسط الرضا</div></div>
              <div class="report-kpi"><div class="val">${stats.kpis.npsScore ?? '—'}</div><div class="lbl">NPS</div></div>
              <div class="report-kpi"><div class="val">${fmtPct(stats.kpis.completionRate)}</div><div class="lbl">معدّل الإتمام</div></div>
            </div>
          </div>
          <div class="report-section">
            <h2>متوسطات الأقسام</h2>
            ${stats.categoryAverages.map(c => `
              <div class="report-bar">
                <span class="score">${c.avg.toFixed(1)}</span>
                <div class="track"><div class="fill" style="width:${(c.avg/5)*100}%"></div></div>
                <span class="name">${c.title}</span>
              </div>
            `).join('')}
          </div>
          <div class="report-section">
            <h2>أبرز الأسئلة</h2>
            <p><strong>الأعلى تقييماً:</strong></p>
            <ul>${stats.topRated.map(t => `<li>${t.label} — ${t.avg.toFixed(1)}</li>`).join('')}</ul>
            <p><strong>بحاجة إلى تطوير:</strong></p>
            <ul>${stats.bottomRated.map(t => `<li>${t.label} — ${t.avg.toFixed(1)}</li>`).join('')}</ul>
          </div>
        `;
      } catch (err) {
        if (err.status === 401) window.location.href = '/admin-login';
        else root.innerHTML = '<p>تعذّر تحميل البيانات</p>';
      }
    }
    load();
  </script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add public/admin-report.html public/css/print.css
git commit -m "feat(ui): print-friendly admin report at /admin/report"
```

---

## Phase 9 — Final wiring & docs

### Task 25: README with deployment instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README with full content**

```markdown
# TrainingSurvey

Arabic-language training-feedback survey for the DocsysFrontend training program. Static HTML/CSS/JS frontend + Netlify Functions backend + Netlify Blobs storage. Wilayah-themed (green/gold), Saudi-tuned MSA copy.

## Local development

Requires Node 20+.

```bash
npm install
npm test            # runs all unit tests (auth, stats, csv)
```

To run the full stack locally (functions + Blobs emulation), install Netlify CLI:

```bash
npm install -g netlify-cli
netlify login
netlify link        # link to your Netlify site (one-time)
netlify dev         # serves on http://localhost:8888
```

Set these env vars locally (Netlify CLI loads from `.env`):

```
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=P@s$w0rd
ADMIN_SESSION_SECRET=<generated with: openssl rand -hex 32>
```

## Deployment

1. Push this folder to a new GitHub repository.
2. On netlify.com → "Add new site" → "Import from Git" → pick the repo.
3. Set environment variables in **Site settings → Environment variables**:
   - `ADMIN_USERNAME` — e.g. `Admin`
   - `ADMIN_PASSWORD` — e.g. `P@s$w0rd`
   - `ADMIN_SESSION_SECRET` — random 32-byte hex string (run `openssl rand -hex 32`)
4. Netlify auto-detects `netlify.toml` and deploys. First build ~30s.
5. Optionally configure a custom domain in **Domain settings**.
6. Share the survey URL with trainees. Admin lives at `<your-site>/admin`.

## Editing questions

Open `public/questions.json`. Add/remove/edit question entries. **Keep stable IDs** if you only edit wording — old responses stay linked. Removing a question: just delete the entry; old data still in blobs (queryable via the `responses` bucket export). Adding a question: new responses get the new field; old ones don't have it (admin dashboard handles missing fields gracefully).

Commit + push = Netlify redeploys automatically.

## Architecture

See `docs/DESIGN.md`.

## Tests

```bash
npm test
```

- `tests/auth.test.js`     — HMAC sign/verify, email hashing
- `tests/stats.test.js`    — aggregation, NPS, word cloud, filtering
- `tests/csv.test.js`      — CSV serialization, Excel compatibility

## Project layout

```
public/         — static files (served at site root)
netlify/        — serverless functions
tests/          — unit tests (node:test)
docs/           — DESIGN.md (spec) + IMPLEMENTATION_PLAN.md
```

## Acceptance checklist

See `docs/DESIGN.md` Section 9. Run through before sharing the link.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with local dev + deploy instructions"
```

---

### Task 26: Final acceptance walkthrough

**Files:** none — verification only

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all 22+ tests pass across 3 test files.

- [ ] **Step 2: Validate `questions.json`**

```bash
node -e "const q = JSON.parse(require('fs').readFileSync('public/questions.json', 'utf8')); console.log('Total questions:', q.sections.flatMap(s => s.questions).length); console.log('Sections:', q.sections.map(s => `${s.title} (${s.questions.length})`).join(', '));"
```

Expected output:
```
Total questions: 30
Sections: تقييم المدرّب (5), الجلسات التدريبية الإلكترونية (4), الجلسات التدريبية الحضورية (4), فهم النظام ومكوّناته (7), المحتوى والمواد (3), التقييم العام والتوصية (3), ملاحظاتكم واقتراحاتكم (4)
```

- [ ] **Step 3: Run `netlify dev` and walk through manual acceptance criteria**

Run `netlify dev` and verify each item from `docs/DESIGN.md` Section 9 (Acceptance Criteria):

1. ✅ Survey loads quickly
2. ✅ All 30 questions render and submit
3. ✅ Submit a survey with email `test@example.com`. Submit again with same email — confirm duplicate modal appears, both store, second is flagged in admin.
4. ✅ Admin login at `/admin-login` with correct creds → dashboard. Wrong creds 5 times → 429.
5. ✅ Dashboard shows KPIs, category bars, question breakdown, Likert, word cloud, respondents, time trend.
6. ✅ Date filter "Today" / "Week" / "Month" changes the stats.
7. ✅ Click "Download JSON" → file downloads, opens as valid JSON.
8. ✅ Click "Download CSV" → open in Excel, Arabic readable.
9. ✅ Click "تقرير قابل للطباعة" → new tab opens, Print → PDF works.
10. ✅ Mid-survey: refresh page → return to gate → re-enter same email → draft restored.
11. ✅ Edit a question label in `public/questions.json` → reload survey → new label appears, old responses still aggregate under the same ID.
12. ✅ Click a respondent in the list → does NOT reveal their individual answers.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit --allow-empty -m "chore: acceptance walkthrough complete"
```

---

## Self-Review Summary

This plan is bounded for a single implementation pass. Major decisions are locked, code samples are complete, and TDD covers the critical backend logic (auth, stats, CSV). Frontend HTML/CSS/JS is integrated and verified by manual acceptance checklist at the end.

**Coverage check vs spec (`docs/DESIGN.md`):**
- ✅ §2 Architecture — Tasks 1, 8, 9, 15, 17, 18, 19
- ✅ §3 Data Model — Tasks 3, 4, 5, 6, 9, 17
- ✅ §4 API Contract — Tasks 9, 15, 17, 18, 19
- ✅ §5 UX Flows — Tasks 10-14 (survey), 16, 22, 23 (admin)
- ✅ §6 Visual Design — Tasks 10, 20, 24
- ✅ §7 Project Structure — established across all tasks
- ✅ §8 Security — Tasks 4, 9, 15, 17 (HMAC, rate limit, XSS strip, timing-safe compare)
- ✅ §9 Acceptance — Task 26
- ✅ §11 Deployment — Task 25
