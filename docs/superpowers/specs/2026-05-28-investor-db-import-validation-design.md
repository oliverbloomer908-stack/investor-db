# Investor DB — Import Validation & Filter UI Improvements

**Date:** 2026-05-28
**Status:** Approved for batch-insert fix only (Filter UI deferred)

---

## Problem Statement

1. **Vercel serverless timeout** — Importing large CSVs (2000+ rows) one-by-one to Neon times out. `ON CONFLICT DO UPDATE` per row is too slow. → **PRIORITY 1**
2. ~~Import silently succeeds with bad data~~ — deferred
3. ~~AI column mapping failures are silent~~ — deferred
4. ~~Filter UI is too basic~~ — deferred

Root cause confirmed by testing: 2056-row Ocean.io CSV causes `FUNCTION_INVOCATION_TIMEOUT` on Vercel serverless.

---

## 1. Import Validation

### Behavior

After parsing the CSV and before inserting, compute a **data quality score**:

- **LinkedIn URL**: +3 points if present
- **Email**: +2 points (only if no LinkedIn)
- **Company name**: +2 points
- **Title or description**: +1 point each (max 2)
- **Location**: +1 point
- **Seniority**: +1 point

**Quality tiers:**
- **Good** (8+ points): proceed silently
- **Warning** (4-7 points): insert but show amber warning listing which fields are missing
- **Poor** (0-3 points): show red error with list of missing fields, **do not insert any rows** — ask user to fix the CSV or confirm they want to proceed anyway

Add a **"Force import anyway"** button for the poor tier that lets users insert despite the warning.

### Detection logic in `requestColumnMapping`

In `lib/aiMapping.ts`, the error-detection block already checks for `trimmed.startsWith('An error')` and returns non-JSON. We need to also detect HTML error pages and surface them as errors rather than silently skipping.

### Changes

- `lib/csv.ts`: Add `assessDataQuality(row, mapping)` function returning a quality score and list of missing fields
- `app/api/import/route.ts`: After column mapping, call `assessDataQuality`. Return quality tier in response. For "poor" tier, return 400 with explicit error listing missing columns.
- `app/components/ImportCSV.tsx`: Show quality warning/error banner with the force-import option for poor data
- `lib/aiMapping.ts`: When AI mapping returns an error indicator (HTML error page), include it in the returned error so the import route can report it

---

## 2. Filter Panel UI Overhaul

### Layout

Two sections stacked:
1. **Field selector checkboxes** (which fields to search across)
2. **Text filters** (one per field, enabled only when checkbox is checked)

### Field Checkboxes

Only the most commonly filtered fields get checkboxes:
- [ ] Name (firstName + lastName, combined)
- [ ] Company Name
- [ ] Location
- [ ] Industry
- [ ] Title
- [ ] Seniority
- [ ] Email
- [ ] LinkedIn URL

Each checkbox enables/disables its corresponding text input below it. Only enabled filters are sent to the API.

### Text Filters

One text input per checkbox, disabled/grayed out when unchecked. Placeholder text shows example values.

### Seniority dropdown

Keeps existing dropdown (Founder, C-Level, Partner, Director, VP, Manager, Any) — no checkbox, always active.

### Results Table Columns

Add **Location** column between Title and Company:
`# | Name | Title | Location | Company | Fit Reason | Score | Action`

### Changes

- `app/components/FilterPanel.tsx`: Complete rewrite with checkbox + conditional text input layout
- `app/components/ResultsTable.tsx`: Add Location column
- `app/api/search/route.ts`: Handle new filter fields (name, company, linkedInUrl, email as keyword-style text filters)
- `app/globals.css`: Add styles for checkbox grid layout

---

## 3. API Fixes

### Handle HTML error pages from MiniMax

In `lib/aiMapping.ts`, after the existing error checks, add: if the response is HTML (starts with `<!` or `<html`), return a descriptive error string rather than empty object.

In `app/api/import/route.ts`, if `aiMappings` contains error strings or is empty due to AI failure, include the failure reason in the `debug` object and surface it in the response so the UI can show what went wrong with column mapping.

---

## File Changes Summary

| File | Change |
|------|--------|
| `lib/csv.ts` | Add `assessDataQuality()` |
| `lib/aiMapping.ts` | Detect HTML error pages, return error strings |
| `app/api/import/route.ts` | Call quality assessment, block poor imports, pass through AI errors |
| `app/components/ImportCSV.tsx` | Show quality warnings, force-import button |
| `app/components/FilterPanel.tsx` | Checkbox grid + conditional text inputs |
| `app/components/ResultsTable.tsx` | Add Location column |
| `app/api/search/route.ts` | Handle new filter fields |
| `app/globals.css` | Filter panel checkbox grid styles |

---

## Testing Checklist

- [ ] Import CSV with LinkedIn + company + title → "Good", inserts silently
- [ ] Import CSV missing LinkedIn but has email → "Warning" banner, still inserts
- [ ] Import CSV with only first name, last name → "Poor" error, blocked, force-import works
- [ ] MiniMax API error → UI shows error message about column mapping failure
- [ ] Filter panel: unchecking "Name" excludes name from search
- [ ] Results table shows Location column
- [ ] Search with no filters returns all (backward compatible)