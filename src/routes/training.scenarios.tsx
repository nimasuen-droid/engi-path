import { createFileRoute, Link } from '@tanstack/react-router';
import { SCENARIOS } from '@/services/training/scenarios';
import { useTraining } from '@/state/training';
import { useState } from 'react';
import { Check, X } from 'lucide-react';

export const Route = createFileRoute('/training/scenarios')({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === 'string' ? s.id : '' }),
  component: ScenariosPage,
});

function ScenariosPage() {
  const { id } = Route.useSearch();
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) return <ScenarioList />;
  return <Player scenarioId={scenario.id} />;
}

function ScenarioList() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {SCENARIOS.map((s) => (
        <Link key={s.id} to="/training/scenarios" search={{ id: s.id }} className="border bg-card p-4 hover:border-primary">
          <div className="font-semibold text-sm">{s.title}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.category}</div>
          <p className="text-xs text-muted-foreground mt-2">{s.description}</p>
        </Link>
      ))}
    </div>
  );
}

function Player({ scenarioId }: { scenarioId: string }) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const { record } = useTraining();
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const current = scenario.steps[step];

  function choose(i: number) {
    const next = [...picks, i];
    setPicks(next);
    if (step + 1 >= scenario.steps.length) {
      const correct = next.filter((p, idx) => scenario.steps[idx].options[p].correct).length;
      const score = Math.round((correct / scenario.steps.length) * 100);
      record(scenario.id, score);
      setDone(true);
    } else setStep((s) => s + 1);
  }

  if (done) {
    const correct = picks.filter((p, idx) => scenario.steps[idx].options[p].correct).length;
    const score = Math.round((correct / scenario.steps.length) * 100);
    return (
      <div className="max-w-xl mx-auto border bg-card p-6 text-center">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Result</div>
        <div className="text-4xl font-mono mt-2">{score}%</div>
        <div className="text-sm text-muted-foreground mt-1">{correct} of {scenario.steps.length} correct</div>
        <div className="mt-6 space-y-2 text-left">
          {scenario.steps.map((s, i) => {
            const pick = picks[i]; const opt = s.options[pick];
            return (
              <div key={i} className="border p-3">
                <div className="text-xs font-medium">{s.prompt}</div>
                <div className={`mt-1 text-xs flex items-start gap-1 ${opt.correct ? 'text-compliant' : 'text-noncompliant'}`}>
                  {opt.correct ? <Check className="size-3.5 mt-0.5" /> : <X className="size-3.5 mt-0.5" />}
                  <span>{opt.label} — {opt.feedback}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-2 justify-center">
          <Link to="/training" className="text-xs border px-3 py-1.5 rounded-sm">Back to Dashboard</Link>
          <button onClick={() => { setStep(0); setPicks([]); setDone(false); }} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{scenario.category} · Step {step + 1}/{scenario.steps.length}</div>
        <h2 className="text-lg font-semibold mt-1">{scenario.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
      </div>
      <div className="border bg-card p-4">
        <div className="text-sm font-medium mb-3">{current.prompt}</div>
        <div className="space-y-2">
          {current.options.map((o, i) => (
            <button key={i} onClick={() => choose(i)} className="w-full text-left border bg-background p-3 text-sm hover:border-primary">
              <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>{o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
