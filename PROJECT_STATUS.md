# Intriwa Cloud Garage CRM — Project Status

_Last updated: 2026-04-27_

---

## Stack

- **Next.js 16.2.4** — App Router, Suspense boundaries
- **React 19** — local state only, no global store
- **Tailwind CSS v4** — custom `brand-navy` + `brand-coral` theme
- **Mock data only** — no backend; all data in `src/lib/mock-data/*.ts`

---

## Routes built

| Route | Status | Notes |
|---|---|---|
| `/login` | ✅ Done | Static login page |
| `/dashboard` | ✅ Done | Summary cards + quick stats |
| `/leads` | ✅ Done | List with area/tag filters, extensible dropdowns |
| `/leads/new` | ✅ Done | New lead form |
| `/leads/[id]` | ✅ Done | Detail page, editable area (custom dropdown), extensible tags |
| `/customers` | ✅ Done | List with area/tag filters, extensible dropdowns |
| `/customers/[id]` | ✅ Done | Detail page — see feature breakdown below |
| `/vehicles` | ✅ Done | Standalone vehicle list with doc-health pills |
| `/services` | ✅ Done | SR list with filters |
| `/services/new` | ✅ Done | Multi-step SR wizard — see feature breakdown below |
| `/services/[id]` | ✅ Done | SR detail page |
| `/mechanics` | ✅ Done | Mechanic list |
| `/mechanics/[id]` | ✅ Done | Mechanic profile |
| `/societies` | ✅ Done | Society list |
| `/societies/[id]` | ✅ Done | Society detail |
| `/dispatch` | ✅ Done | Dispatch board |
| `/settings` | ✅ Done | Settings page |

---

## Feature log — what was built

### Extensible list selects (everywhere)
- Every area dropdown has a **"New area…"** text input at the bottom — type and hit Add to persist in local state.
- Every tag selector has an inline **"New tag…" input + Add button** — new tags appear immediately as selectable pills.
- Applies to: Leads list, Customers list, Services list, Lead detail, Customer detail, Service detail.

### Customer detail page (`/customers/[id]`)
- **Editable address** — click address text → inline `<textarea>`, blur to save (mock toast).
- **Editable area** — custom dropdown replaces native `<select>`; supports adding new areas inline.
- **Extensible tags** — inline add-tag form below existing pills.
- **Activity tab** — categorized audit trail:
  - Work (SRs) — links to SR detail, shows services/mechanic/amount/status badge.
  - Invoice — expandable inline with amount/tax/total/payment mode/paid date.
  - Follow-up — shows reason, due date, status badge.
  - Filter pills: All | Work | Invoice | Follow-up; sorted newest-first.
- **New SR button** — pre-fills `?customerId=` so wizard skips Customer step.

### Vehicles page (`/vehicles`)
- Search by registration, make, model, owner name/phone.
- Filters: vehicle type (4W / 2W), fuel type, doc health (alert / OK).
- **DocPill** component — colour-coded days-to-expiry for PUC and Insurance.
  - Red = expired or ≤30 days, Amber = ≤90 days, Green = OK.
- Click row → navigate to owner's customer detail page.
- **"New SR" button** per row → `/services/new?customerId=X&vehicleId=Y`.

### SR wizard (`/services/new`) — step-by-step

| Step | What's there |
|---|---|
| 0 · Customer | Search + select customer |
| 1 · Vehicle | Customer's vehicles; shows last service date |
| 2 · Issues/Services | Searchable catalog (grouped by category when idle, flat when searching); custom service add; **duration auto-computed** from selected services + 60-min travel buffer for doorstep |
| 3 · Schedule | Date / Time / Duration (3-column grid for "specific" preference); **default duration = 60 min** |
| 4 · Mechanic | Mechanics split: **"Free at [time]"** (top, green header) vs **"Busy at [time]"** (bottom, grey, dimmed); availability computed against actual scheduled SRs on that date/time; **DayTimeline** (8am–7pm hourly slots) + **WeekCalendar** (Mon–Sun job-count bars) per mechanic; **multi-mechanic split toggle** — off = single pick, on = one mechanic per service category |
| 5 · Review | Summary of all choices; split-assignment panel when multi-mechanic is on |

**URL pre-fill + step skip:**
- `/services/new?customerId=X` → starts at step 1 (Vehicle).
- `/services/new?customerId=X&vehicleId=Y` → starts at step 2 (Issues).

**Multi-mechanic split assignment:**
- Toggle "Split by service type" in Mechanic step.
- Services grouped by category (4W, Wash, Accessory, etc.).
- Each group shows a filtered mechanic `<select>` with skill matching.
- Review shows per-group assignments + amber notice: "Multiple SRs will be created".

---

## What needs to be done next

### High priority

- [ ] **Vehicles detail page** (`/vehicles/[id]`)
  - Vehicle profile: registration, make/model/year/color, fuel type, owner card (link to customer).
  - Documents section: PUC expiry, insurance expiry, RC number — editable.
  - Service history tab: all SRs for this vehicle, sorted newest-first.
  - "New SR" button pre-filled with vehicle + owner.

- [ ] **Invoice / payment flow**
  - `/invoices` list page (currently referenced in customer activity but no standalone list).
  - `/invoices/[id]` detail — line items, tax, total, payment status, "Mark Paid" action.
  - Link from SR detail → "Generate Invoice".

- [ ] **Follow-up management**
  - `/followups` list page — due-date sorted, overdue highlighted.
  - Mark complete / reschedule inline.
  - Follow-ups currently only visible inside customer Activity tab.

- [ ] **Notifications / reminders panel**
  - PUC/Insurance expiry alerts surfaced to ops manager (today: only visible on Vehicles list).
  - Follow-up due-today alerts.
  - Could be a top-bar bell icon with a dropdown.

### Medium priority

- [ ] **Real-time mechanic status on Dispatch board**
  - Currently static; should reflect scheduled SRs from mock data.
  - Show mechanic location (area) + current job + next job.

- [ ] **SR status workflow**
  - Move SR through states: `pending → confirmed → in_progress → completed → invoiced → paid`.
  - Status change buttons on SR detail page.
  - Mechanic mobile view (simplified — just their jobs for the day).

- [ ] **Society CRM enhancements**
  - Society detail: list of member customers, aggregate stats (total vehicles, total SRs).
  - Bulk follow-up / campaign trigger from society page.

- [ ] **Lead → Customer conversion**
  - "Convert to Customer" button on lead detail page.
  - Auto-creates customer record, pre-fills from lead data.

- [ ] **Search (global)**
  - Top-bar search across customers, vehicles, SRs, leads.
  - Keyboard shortcut (⌘K).

### Low priority / polish

- [ ] **Pagination / infinite scroll** on all list pages (currently renders all mock records).
- [ ] **Export** — CSV download for vehicles with expiring docs, SR reports.
- [ ] **Dark mode** toggle in Settings.
- [ ] **Mobile-responsive layout** — sidebar collapses to bottom tab bar on narrow viewports.
- [ ] **Mechanic [id] page enhancements** — weekly calendar, earnings summary, skill editing.
- [ ] **Settings page content** — garage profile, working hours, service catalog editor, area list editor.

---

## Key files reference

```
src/
  app/(app)/
    customers/[id]/page.tsx   — Customer detail (address edit, tags, activity tab, New SR link)
    vehicles/page.tsx          — Vehicles list (DocPill, New SR button per row)
    services/new/page.tsx      — SR wizard (multi-step, URL pre-fill, split assignment)
    leads/[id]/page.tsx        — Lead detail (EditableArea, TagsCard)
  components/layout/
    Sidebar.tsx                — Nav items (Dashboard → Leads → Customers → Vehicles → Services → Mechanics → Societies → Dispatch)
  lib/mock-data/
    customers.ts
    vehicles.ts
    service-requests.ts
    mechanics.ts
    invoices.ts
    follow-ups.ts
    societies.ts
```
