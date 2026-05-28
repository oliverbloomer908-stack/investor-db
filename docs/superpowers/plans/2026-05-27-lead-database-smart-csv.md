# Lead Database + Smart CSV Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lead database browser page with tab navigation, fix the CSV import pipeline, and make the column mapping smarter with AI-assisted fallback.

**Architecture:**
- Two Next.js pages: `/` (AI ranking + search) and `/database` (lead browser)
- Top navigation bar with "Search" and "Database" tabs
- SQLite database stores all imported investors; rank and search both read from the same table
- AI-assisted column mapping: rules-based detection first, Minimax AI for unmapped columns only

**Tech Stack:** Next.js (App Router), better-sqlite3, Minimax API, plain CSS (no Tailwind)

---

## Task 1: Add tab navigation bar

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `app/components/NavBar.tsx`

- [ ] **Step 1: Create NavBar component**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="main-nav">
      <span className="nav-brand">Riyal Capital</span>
      <div className="nav-tabs">
        <Link href="/" className={`nav-tab ${pathname === '/' ? 'active' : ''}`}>Search</Link>
        <Link href="/database" className={`nav-tab ${pathname === '/database' ? 'active' : ''}`}>Database</Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update layout to include NavBar**

Add `<NavBar />` inside `<body>` in `app/layout.tsx`, after the opening body tag.

- [ ] **Step 3: Add CSS for nav**

In `app/globals.css`, add nav styles: `.main-nav` with dark background, `.nav-brand`, `.nav-tabs` with flex layout, `.nav-tab` with hover and active states.

- [ ] **Step 4: Apply app-header fix**

Remove the duplicate `<header className="app-header">` from `app/page.tsx` since nav is now shared.

- [ ] **Step 5: Commit**
```bash
git add app/layout.tsx app/page.tsx app/components/NavBar.tsx app/globals.css
git commit -m "feat: add tab navigation with Search and Database tabs"
```

---

## Task 2: Build the Database page (`/database`)

**Files:**
- Create: `app/database/page.tsx`
- Create: `app/components/DatabaseTable.tsx`
- Create: `app/components/InvestorDetail.tsx`
- Modify: `app/api/search/route.ts` (add count endpoint)
- Modify: `app/globals.css`

- [ ] **Step 1: Add total count API**
Add a new endpoint GET `/api/investors/count` that returns `{ count: number }`.

- [ ] **Step 2: Create DatabaseTable component**

A compact table with columns: Name, Title, Company, Location, Seniority, Action (LinkedIn button). Fetches all investors from GET `/api/search` (unfiltered). Keyword search bar at top filters client-side by name/title/company/location. Pagination controls (prev/next) with 50 per page. Each row is clickable.

- [ ] **Step 3: Create InvestorDetail slide-out panel**

When a row is clicked, a right-side slide-out panel (300-400px wide) shows all investor fields: Full Name, LinkedIn (clickable), Title, Company, Location, Seniority, Industries, Email, Domain, Description, Company Description. Has a close button.

- [ ] **Step 4: Create database page**

`app/database/page.tsx` — fetches investors list, renders DatabaseTable. Shows empty state if no investors in DB.

- [ ] **Step 5: Add CSS**

Table styles, slide-out panel animation (transform: translateX), overlay backdrop, pagination styles.

- [ ] **Step 6: Commit**
```bash
git add app/database app/api/investors/count/route.ts app/components/DatabaseTable.tsx app/components/InvestorDetail.tsx app/globals.css
git commit -m "feat: add database browser page with compact table and detail panel"
```

---

## Task 3: Fix CSV import — debug why "0 imported"

**Files:**
- Create: `app/api/import/debug/route.ts`
- Modify: `app/api/import/route.ts`
- Add logging for unmapped columns

- [ ] **Step 1: Create debug import endpoint**

POST `/api/import/debug` — accepts the same CSV file, returns the first detected row, its column mapping, and what `mapRowToInvestor` produces. This lets us see exactly what fields are being detected and whether linkedInUrl ends up empty (which causes the insert to silently skip).

- [ ] **Step 2: Fix the import flow based on debug findings**

Expected likely fix: add a `meta` field mapping for columns that aren't in `Investor` type, or fuzzy-match additional header variants.

- [ ] **Step 3: Commit**
```bash
git add app/api/import/debug/route.ts
git commit -m "debug: add import debug endpoint"
```

---

## Task 4: Add AI-assisted column mapping for tricky columns

**Files:**
- Modify: `lib/csv.ts`
- Create: `lib/aiMapping.ts`
- Modify: `app/api/import/route.ts`

- [ ] **Step 1: Create AI mapping function**

`lib/aiMapping.ts` — `requestColumnMapping(headers: string[], sampleRows: Record<string, string>[]): Promise<ColumnMapping>` — sends headers + sample rows to Minimax, asks it to return a JSON object mapping each header to an Investor field name. Only needed for headers that `detectColumns` couldn't match.

- [ ] **Step 2: Update detectColumns to also return confidence**

Refine `detectColumns` to return a confidence score per field. Fields with low confidence get flagged for AI mapping.

- [ ] **Step 3: Update import route to use AI fallback**

After `detectColumns` runs, identify any unmapped fields. For those with headers still unused, call `requestColumnMapping`. Merge AI mapping result onto the existing mapping, preferring AI's choice when rules conflict.

- [ ] **Step 4: Commit**
```bash
git add lib/aiMapping.ts lib/csv.ts app/api/import/route.ts
git commit -m "feat: add AI-assisted column mapping fallback for CSV import"
```

---

## Task 5: Fix rank API JSON parsing robustly

**Files:**
- Modify: `lib/minimax.ts`
- Modify: `app/api/rank/route.ts`

- [ ] **Step 1: Read minimax.ts to verify fix is in place**

Ensure `chatCompletion` strips `<reasoning>` tags and handles non-JSON API responses.

- [ ] **Step 2: Enhance rank API fallback parsing**

Ensure the rank route tries: (1) direct JSON.parse, (2) extract from markdown code fences, (3) extract bare `[{...}]` array. Return the raw text in the error response when all three fail.

- [ ] **Step 3: Commit**
```bash
git add lib/minimax.ts app/api/rank/route.ts
git commit -m "fix: robust JSON parsing for AI rank responses"
```

---

## Task 6: Final integration test

- [ ] **Step 1: Run import with a real CSV**

Test the full pipeline: upload CSV → import → verify "X imported" count matches expected

- [ ] **Step 2: Test database page**

Navigate to /database, verify all investors appear in table, click a row to open detail panel

- [ ] **Step 3: Test AI ranking**

Run an AI ranking query from homepage, verify results render

- [ ] **Step 4: Commit everything**
