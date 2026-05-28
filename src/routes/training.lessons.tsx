import { createFileRoute } from '@tanstack/react-router';
import { Lock } from 'lucide-react';

const LESSONS = [
  { title: 'Pipeline design fundamentals', desc: 'Pressure, temperature, fluid classification, governing codes.' },
  { title: 'Class location & design factor', desc: 'How population density shapes allowable stress.' },
  { title: 'Material selection for sour service', desc: 'NACE MR0175 hardness and chemistry rules.' },
  { title: 'Hydrostatic testing fundamentals', desc: 'Strength vs leak test, hold times, acceptance.' },
  { title: 'Integrity management foundations', desc: 'Threats, risk, inspection planning per API 1160.' },
];

export const Route = createFileRoute('/training/lessons')({
  component: Lessons,
});

function Lessons() {
  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground italic">Phase 2 module — lesson content arrives next iteration.</div>
      <div className="grid md:grid-cols-2 gap-3">
        {LESSONS.map((l) => (
          <div key={l.title} className="border bg-card p-4 opacity-80">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-sm">{l.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
              </div>
              <Lock className="size-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
