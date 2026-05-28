# Pipeline Design & Compliance Assistant

A local-first engineering web app with **Engineer Mode** and **Training Mode** active, **Enterprise Mode** visible but disabled. Phase 1 fully functional; Phase 2 navigable with mock data.

## Design System

Engineering-grade, EPC-style. Tokens in `src/styles.css` (oklch):
- `--primary` deep blue (~#0E3B66)
- `--graphite` neutral surface (~#2A323A)
- `--compliant` green, `--warning` muted orange, `--noncompliant` red, `--incomplete` grey
- Mono accents (JetBrains Mono) for numeric/code output, Inter for UI
- Clean dense layout, sharp corners (radius sm), data-table aesthetic, no playful motion

## Architecture

```text
src/
  routes/                # TanStack routes (welcome, /engineer/*, /training/*)
  components/            # Shared UI (StatusBadge, MetricCard, FormulaBlock, NodePalette…)
  services/
    storage/             # IndexedDB (idb) + localStorage fallback, project repo
    calculations/        # wallThickness, maop, hydrotest, sizing, pressureDrop, velocity, hoopStress
    compliance/          # rule engine (JSON rules), evaluator, scoring
    rules/               # rules library (gas→B31.8, sour→NACE, class location, etc.)
    codes/               # code library metadata (summarized, no copyrighted text)
    reports/             # jsPDF generators per report type
    training/            # scenario definitions + scoring
    audit/               # change log service
  models/                # Project, Workflow, Rule, Scenario, AuditEntry types
  state/                 # Zustand stores (projects, activeProject, mode)
```

UI never embeds engineering logic — components call services.

## Phase 1 — Functional

1. **Welcome / Mode Select** — 3 cards, Enterprise disabled with "Coming Soon" chip.
2. **Engineer Shell** — sidebar nav (Dashboard, Projects, Design Basis, Calculations, Workflow, Compliance, Intelligent Review, Integrity, Code Library, Reports, Audit Trail).
3. **Projects** — CRUD (create/edit/duplicate/archive), IndexedDB persistence, project list + detail.
4. **Design Basis Wizard** — 7 steps, writes to active project; surfaces governing codes with summarized rationale.
5. **Calculators** — wall thickness (Barlow per B31.4/8 form), MAOP, hydrotest, sizing, pressure drop, velocity, hoop stress, design factor check. Each shows inputs, formula, assumptions, code ref, pass/fail.
6. **Compliance Engine** — JSON rules evaluated against project; colored status (green/yellow/red/grey) + score.
7. **Workflow Builder** — React Flow canvas with engineering node types, save/load per project, dependency validation, export summary.
8. **Code Library** — searchable list with summarized explanations + applicability (no copyrighted text).
9. **Reports** — jsPDF: Design Basis Memo, Wall Thickness, Hydrotest, Compliance Summary, Workflow Summary.
10. **Engineer Dashboard** — project cards, compliance score, review status, workflow %, unresolved issues.
11. **Training Mode** — dashboard + 4 scenarios (gas code selection, design factor by class, wall thickness, hydrotest validation) with guided decisions, feedback, scoring.

## Phase 2 — Scaffold (mock data, navigable)

Intelligent Design Review (upload UI + mock findings), Advanced Rule Engine (rule list UI reading same JSON), Auto Compliance Validator (computed scores), Recommendation Engine (mock recs tied to project state), Advanced Training Simulator (locked scenario cards), Integrity Management (corrosion growth / remaining life sample calcs), Design Review Dashboard, Competency Tracking (levels), Audit Trail (live for Phase 1 actions).

## Tech

React + TS + Tailwind (existing), TanStack Router, `idb` for IndexedDB, `reactflow`, `jspdf` + `jspdf-autotable`, `zustand`, `zod`, `lucide-react`.

## Build Order

Per spec: storage+project CRUD → Design Basis Wizard → wall thickness + compliance → workflow builder → dashboard → PDF reports → training → remaining calculators → code library → Phase 2 scaffolds → audit trail wired throughout.

## Disclaimers

Code references are summarized paraphrases with citation only — no copyrighted standard text reproduced. A persistent footer note states the tool aids engineering judgment and does not replace qualified review.

## Out of scope for this build

Supabase/cloud sync, real document parsing/AI, multi-user auth, role-based access, DCC/MDR integration — surfaced as Enterprise "Coming Soon".

Given the size, this will land as a substantial first pass focused on the acceptance criteria (mode select, project CRUD, wizard, wall thickness + compliance, workflows, PDF, 4 scenarios), with the other Phase 1 calculators/code library and all Phase 2 scaffolds wired in. Expect follow-up iterations to polish individual modules.
