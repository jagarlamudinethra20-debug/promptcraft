# PROMPT CRAFT — Competition Portal (rebuild in Lovable)

Rebuild the event portal here as a clean, reliable app: participant submission page, admin command center, leaderboard, and stage screen. Backed by Lovable Cloud (database + server logic), using environment variables for all secrets and database access.

## Why the admin portal misbehaves today

Two distinct bugs, both fixed by design here:

1. **Status flipping between Start and Stop, resetting on tab switch.** The current portal keeps competition status in component state and also polls the API. When you click Start, local state says RUNNING, but the next poll (or the refetch that fires when a tab regains focus) returns the older/cached value and flips it back. Combined with `force-dynamic` routes and no write confirmation, you get the ping-pong.
   Fix: the database row is the only source of truth. Start/Stop is a mutation that waits for the write to commit, then invalidates the cached status. No local status state, no optimistic toggle, and the admin session is stored so a tab switch never bounces you back to the password screen.

2. **Answers/scores not displayed.** Submissions and evaluations live in separate tables; the admin table renders submission rows only, so score and feedback columns stay blank whenever the evaluation write happened after the row was fetched.
   Fix: one query that returns each submission joined with its evaluation, refreshed on a fixed interval, with explicit `QUEUED / PROCESSING / EVALUATED / FAILED` badges so a missing score is visibly "not judged yet" rather than blank.

## What gets built

**Database (Lovable Cloud)**
- `competition_sessions` — single row: status (RUNNING/PAUSED), mode, results_locked.
- `submissions` — receipt id (`PC-XXXX`), participant name, registration id, institution, llm model, prompt text, output text, status.
- `evaluations` — total score, rubric breakdown (7 params), prompt analysis (11 params), overall feedback, provider/model, manual-override fields with audit note.
- Public can insert a submission only while status is RUNNING; scores and admin data are readable only through server logic.

**Pages**
- `/` — mobile-first submission form. Shows the closed/waiting screen when status is PAUSED, opens instantly when the admin starts. Returns the `PC-XXXX` receipt on submit.
- `/admin` — password gate (configured via `ADMIN_PASSWORD` env var, verified server-side, session remembered). Live status banner, Start/Stop with confirm, queue telemetry, submissions table with prompt/output/score/feedback expandable rows, Evaluate Queue button, manual score override with mandatory note, Lock Final Results, CSV export.
- `/leaderboard` — password-gated ranked list with tied-rank resolution (1, 1, 3).
- `/stage` — full-screen projector view: QR code to the submission portal plus live top rankings.

**AI judging**
- Judging runs through Lovable AI (no Groq/Gemini keys to manage) against the same 7-parameter competition rubric and 11-parameter prompt analysis, grounded in the 20 Super El Niño agronomic chunks.
- Queue is processed one job at a time with a lease so a submission can never be double-judged; auto-triggered on submit and re-triggered from the admin dashboard while anything is queued.

## Technical notes

- TanStack Start; all writes and the AI judge run in server functions, never in the browser.
- Admin polling uses TanStack Query with a fixed refetch interval, `refetchOnWindowFocus` off for the status query, and cache invalidation after each mutation — this is what removes the tab-switch reset.
- Password check happens server-side; the client only holds a signed session flag.
- Google Sheets / Telegram mirrors are omitted unless you want them; CSV export covers the results sheet.

## Build order

1. Database schema + seed session row.
2. Submission portal at `/` with online/offline gating.
3. Admin auth, status control, submissions table with joined evaluations.
4. AI judge + queue processing, Evaluate Queue, override, CSV.
5. Leaderboard and stage screen.
