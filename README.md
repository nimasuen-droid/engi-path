# Pipeline Design and Compliance Assistant

A local-first web application for pipeline engineers to create a pipeline design basis, run screening calculations, check compliance rules, build an engineering workflow, generate project reports, and train junior engineers on the reasons behind design decisions.

The app is intended to replace scattered Excel calculator worksheets with one guided engineering workspace. It is not a substitute for the governing code, a certified calculation package, or review by a qualified pipeline engineer. It is a structured assistant that helps engineers make better decisions, document assumptions, and identify what still needs specialist review.

## What The App Is Supposed To Do

The product goal is to act like a desktop engineering assistant for pipeline design. A junior or inexperienced pipeline engineer should be able to open a project, follow guided inputs, select validated options from dropdowns, learn why each input matters, run calculations, receive recommendations when checks fail, and generate controlled reports for review.

At a high level, the app should help the engineer:

- Create and manage pipeline projects.
- Load sample projects for training and testing.
- Build a design basis covering fluid, route, design code, pressure, temperature, material, corrosion allowance, OD, wall, MAOP, hydrotest pressure, class location, and reviewer.
- Select the correct governing code basis, such as ASME B31.8 for gas, ASME B31.4 for liquid service, DNV-ST-F101 for subsea/offshore, and specialist references for CO2, hydrogen, sour service, and integrity.
- Run pipeline design calculations with formulas, assumptions, code references, pass/fail status, learning notes, drivers, and recommendations.
- Recommend pipe size, wall, and material options using engineering screening logic.
- Explain why a result fails and what a pipeline engineer is normally allowed to adjust.
- Check compliance and flag missing, inconsistent, or risky inputs.
- Build a design workflow from design basis through calculations, material selection, hydrotest, integrity review, and approval.
- Generate project reports and issue-readiness summaries.
- Provide training mode with lessons, scenarios, feedback, and competency tracking.

## What It Does Now

This build currently provides a functional Phase 1 engineering assistant with sample data and local browser storage.

### Project Workspace

The app includes project creation and editing, active project selection, and five sample pipeline projects:

- 30 in onshore gas transmission pipeline.
- 24 in sour gas class 3 pipeline.
- 20 in crude oil export line.
- 16 in subsea multiphase flowline.
- 12 in dense-phase CO2 pipeline.

Projects are stored locally in the browser. No cloud backend is required.

### Design Basis Wizard

The Design Basis module guides the user through core project data. It uses controlled choices where possible, including fluid type, installation type, design code, route region, class location, material, OD, and wall data.

The wizard now gives feedback when the user clicks **Finish & Save** and moves the user directly to the Calculations page so the next engineering step is obvious.

### Calculations

The Calculations module currently includes screening-level engineering calculations and decision support for:

- Wall thickness.
- MAOP.
- Hydrotest pressure.
- Hoop stress.
- Velocity.
- API RP 14E erosion velocity screening.
- Pressure drop.
- Surge allowance.
- Vapor pressure margin.
- Material recommendation.
- Automated optimization suggestions.
- Pipeline design case comparison.
- EPC calculation controls for traceability and report issue readiness.

Each calculation is intended to show:

- Formula.
- Result and unit.
- Pass/fail or review status.
- Assumptions.
- Code or practice reference.
- Insight into what drives the result.
- Recommendations when the result fails.
- Warning or fail indicators on calculation headings.

The design assistant can recommend better combinations of OD, wall schedule, and material grade based on the project pressure basis and screening hydraulic assumptions.

The calculation workspace also includes a deeper EPC-style control layer:

- Configurable code edition basis.
- Metric or US customary display basis.
- Dual-unit entry for pressure and length values, including MPa/psi and mm/in.
- Route section setup for mainline, crossings, and facility tie-ins.
- Component pressure-limit setup for line pipe, valves, flanges, and fittings.
- Weakest-component screening against design pressure and hydrotest pressure.
- Traceable calculation sheets with inputs, formulas, assumptions, code basis, and limitations.
- Calculation revision history with basis hash and status.
- Issue validation before reports are treated as ready for approval.

### Compliance Review

The compliance engine checks project data against rule-based engineering logic. It currently flags issues such as:

- Missing project data.
- Missing design pressure.
- Missing OD or wall thickness.
- Code mismatch against fluid or installation basis.
- Sour service material qualification needs.
- Hydrogen derating review.
- CO2 phase-envelope and fracture review.
- Class location design factor requirements.
- Integrity management triggers.
- Long-life fitness-for-service planning.

These are screening checks. They are not a full copyrighted code implementation.

### Technical Assurance Review

The Technical Assurance Review module has been upgraded from placeholder content to project-derived review logic. It now uses the active project, compliance findings, calculations, and material/design recommendations to identify blockers, warnings, and recommended actions.

Its role is to behave like a senior engineering review checklist: it tells the user what should be fixed before the design is treated as ready for issue.

### Integrity Management

The Integrity Management module has been upgraded from a static mock page to a project-linked integrity planning tool. It now includes:

- Integrity management plan summary.
- Threat register.
- Likelihood, consequence, and risk screening.
- Mitigation planning.
- Anomaly assessment inputs.
- Remaining life and inspection interval screening.
- Local persistence per project.

This is still a screening assistant, not a full API 1160, ASME B31.8S, or API 579 software implementation.

### Workflow Builder

The Workflow Builder now does more than draw nodes. It acts as an engineering gate workflow. The workflow checks whether the active project has closed or open gates for:

- Design basis.
- Hydraulics.
- Wall thickness.
- Material selection.
- Hydrotest.
- Integrity review.
- Approval.

The canvas still uses React Flow for visual workflow editing, but the sidebar now shows issue readiness and gate status based on real project data. Saving a workflow records the engineering sequence while warning the user about open gates.

### Reports

The Reports module now behaves more like a controlled engineering deliverables area. It includes:

- Readiness score.
- Blocker count.
- Reviewer status.
- Workflow status.
- Engineering Design Package PDF.
- Design Basis Memo PDF.
- Wall Thickness Report PDF.
- Hydrotest Report PDF.
- Compliance Summary PDF.
- Workflow Summary PDF.
- Report issue validation based on code edition, route sections, component limits, saved calculation revisions, weakest component, and compliance blockers.

Reports use the active project basis, including selected material and class-location design factor where applicable. Reports also warn when blockers remain and should not be treated as approved deliverables until review is complete.

### Code Library

The Code Library provides searchable summaries and learning guidance for engineering standards. It intentionally avoids reproducing copyrighted full text.

### Training Mode

Training mode supports junior engineer learning through:

- Guided lessons.
- Practice scenarios.
- Feedback.
- Competency tracking.
- Training reports.
- Manual/instruction pages.

The aim is to help a trainee understand not only what answer to choose, but why that answer is technically important.

## How The App Works

The normal workflow is:

1. Open the app and select or create a project.
2. Use the Design Basis wizard to define the pipeline case.
3. Save the basis and move to Calculations.
4. Run calculations and review pass/fail indicators.
5. Use recommendations to adjust allowed engineering variables, such as material grade, wall thickness, OD, pressure basis, corrosion allowance, or hydraulic assumptions.
6. Review compliance findings and close incomplete or non-compliant items.
7. Use Technical Assurance Review to see senior-review style blockers and actions.
8. Use Integrity Management to define threats, anomaly screening, and inspection planning where relevant.
9. Use Workflow Builder to confirm the design sequence and gate readiness.
10. Generate reports for review and project records.

## Engineering Logic Included

The current engineering logic is screening-level and includes:

- Barlow-style pressure wall thickness.
- MAOP from selected wall, material strength, corrosion allowance, and design factor.
- Hydrotest pressure screening.
- Hoop stress.
- Velocity.
- Darcy-Weisbach pressure drop screening.
- Surge pressure margin.
- Vapor pressure margin.
- API RP 14E erosional velocity screening using `V_e = C / sqrt(rho_m)`.
- Material grade screening using a simple API 5L style material library.
- Rule-based compliance checks.
- Project-derived review findings.
- Integrity risk screening.
- Design option ranking for OD, schedule, and material.
- Configurable code-edition metadata.
- Unit display conversion for common engineering values.
- Route-section and component-limit screening.
- Traceable calculation sheets and calculation revision snapshots.
- Report issue-gate validation.
- Calculation classification badges: Screening, Design Basis, and Detailed / Not Implemented.
- Engineering assumptions register with source, confidence, owner, and status.
- Data confidence indicators for active project inputs and reports.

## Important Engineering Limitations

The app is not yet a full EPC-grade calculation suite. Current limitations include:

- Calculations are screening/design-basis calculations, not final certified code calculations.
- The app does not include full ASME, API, DNV, ISO, or NACE copyrighted text.
- Hydraulic calculations are simplified and do not replace a detailed steady-state or transient model.
- Multiphase, slugging, erosion, hydrate, wax, thermal expansion, upheaval buckling, free-span, on-bottom stability, external pressure collapse, propagation buckling, installation, fatigue, fracture control, and geohazard checks are not yet fully implemented.
- Material recommendations are screening recommendations and must be confirmed against project specification, toughness, weldability, sour service, fracture, temperature, procurement, and constructability requirements.
- Integrity and anomaly checks are simplified and should not be used as final API 579, ASME FFS-1, or code compliance decisions.
- Generated PDFs are design-assistance reports, not automatically approved engineering deliverables.

## Technology

- React 19
- TanStack Router / TanStack Start
- TypeScript
- Tailwind CSS
- React Flow
- Zustand
- IndexedDB/local browser storage
- jsPDF and jsPDF AutoTable
- Lucide icons

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Current Status

The app is now a functional local MVP for pipeline design assistance, training, screening calculations, rule-based compliance review, issue-readiness workflow, integrity planning, and PDF reporting.

The next major step is to deepen the engineering calculation library so it more closely matches world-class EPC calculator suites, with traceable calculation sheets, configurable code editions, unit handling, route sections, component limits, calculation revision history, and stronger validation before report issue.

The first layer of that EPC calculator-suite direction is now implemented, including dual-unit pressure/length entry and an API RP 14E erosion velocity check. Remaining future work should focus on deeper physics and code modules: detailed route hydraulics, transient surge modeling, component pressure-temperature classes, external pressure/collapse, installation load cases, span/on-bottom stability, fracture control, fatigue, thermal expansion, route section class changes, formal calculation approval workflow, and exportable calculation sheets with revision signatures.
