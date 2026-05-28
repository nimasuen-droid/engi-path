import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GraduationCap,
  Hammer,
  ShieldCheck,
} from "lucide-react";

const engineerSteps = [
  {
    title: "1. Load or create a project",
    text: "Start in Projects. Load the 5 sample projects for practice, or create a new project and enter the project name, client, region, fluid, installation, code, material, OD/NPS, wall, MAOP, and hydrotest basis.",
  },
  {
    title: "2. Complete the Design Basis",
    text: "Use the wizard to confirm the fluid, route/installation, class location, design pressure, design temperature, material, corrosion allowance, and governing code.",
  },
  {
    title: "3. Run calculations",
    text: "Open Calculations and check wall thickness, MAOP, hydrotest pressure, hoop stress, velocity, pressure drop, sizing, and class-location design factor.",
  },
  {
    title: "4. Review compliance",
    text: "Open Compliance Review to resolve missing data, code mismatch, hydrotest ratio issues, wall-thickness failures, sour service, CO2, hydrogen, and integrity triggers.",
  },
  {
    title: "5. Build the workflow",
    text: "Use Workflow Builder to map the engineering sequence from design basis through hydraulics, wall thickness, material, hydrotest, integrity, and approval.",
  },
  {
    title: "6. Generate reports",
    text: "Generate the Design Basis Memo, Wall Thickness Report, Hydrotest Report, Compliance Summary, and Workflow Summary for review or audit files.",
  },
];

const trainingSteps = [
  "Read Guided Lessons to understand the core design ideas.",
  "Run Scenario Simulator exercises and read the instant feedback.",
  "Use Code & Calc Practice to reinforce formulas and code selection logic.",
  "Track progress in Competency Tracker and repeat scenarios until the reasoning is clear.",
];

export function UserGuide() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="app-card p-5 sm:p-6">
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          User Instruction
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Pipeline Design & Compliance Assistant
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          This app helps pipeline engineers design, check, document, and learn pipeline engineering
          decisions using summarized engineering code logic. It keeps project data local in the
          browser and gives junior engineers a structured path from design basis to calculations,
          compliance checks, workflow, and reports.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <PurposeCard
          icon={Hammer}
          title="Engineer Mode"
          text="Use this for real project work: create pipeline projects, define the design basis, run calculations, check compliance, build workflows, and generate PDF reports."
        />
        <PurposeCard
          icon={GraduationCap}
          title="Training Mode"
          text="Use this to train junior engineers through lessons, scenarios, instant feedback, and competency tracking."
        />
        <PurposeCard
          icon={ShieldCheck}
          title="Assurance Goal"
          text="The intended result is a traceable engineering package: basis, calculations, findings, workflow evidence, reports, and learning history."
        />
      </div>

      <section className="app-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">What The App Should Achieve</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Outcome text="Reduce scattered spreadsheet/PDF work by keeping project data, calculations, compliance findings, and reports in one place." />
          <Outcome text="Guide inexperienced engineers through code-driven choices such as fluid service, class location, OD/NPS, material, design factor, MAOP, and hydrotest pressure." />
          <Outcome text="Flag incomplete or risky engineering inputs early, before reports or design records are issued." />
          <Outcome text="Train engineers by explaining why each decision matters, how to make the selection, and what drives the result." />
        </div>
      </section>

      <section className="app-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Engineer Workflow</h2>
        <div className="mt-4 grid gap-3">
          {engineerSteps.map((step) => (
            <div key={step.title} className="border-l-4 border-l-primary bg-muted/30 p-3">
              <div className="text-sm font-semibold">{step.title}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="app-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Training Workflow</h2>
        <div className="mt-4 grid gap-2">
          {trainingSteps.map((step) => (
            <div key={step} className="flex gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-compliant" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="app-card p-5 sm:p-6">
        <div className="flex gap-3">
          <AlertTriangle className="mt-1 size-5 shrink-0 text-warning" />
          <div>
            <h2 className="text-lg font-semibold">Important Limits</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This is an engineering decision-support and training tool. It does not replace the
              governing code, licensed standards, client specifications, a qualified engineer, or
              formal checker approval. Code text is summarized only to avoid reproducing protected
              standards.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/engineer/projects"
          className="tap-target inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
        >
          <Hammer className="size-4" /> Start Engineer Workflow
        </Link>
        <Link
          to="/training/lessons"
          className="tap-target inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <GraduationCap className="size-4" /> Start Training
        </Link>
      </div>
    </div>
  );
}

function PurposeCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="app-card p-4">
      <Icon className="size-5 text-primary" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function Outcome({ text }: { text: string }) {
  return (
    <div className="flex gap-2 text-sm text-muted-foreground">
      <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );
}
