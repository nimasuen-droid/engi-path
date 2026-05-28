import { createFileRoute, Link } from '@tanstack/react-router';
import { SCENARIOS } from '@/services/training/scenarios';

export const Route = createFileRoute('/training/practice')({
  component: Practice,
});

function Practice() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Quick-fire decision and calculation exercises. Powered by the same scenario engine.</p>
      <div className="grid md:grid-cols-2 gap-3">
        {SCENARIOS.map((s) => (
          <Link key={s.id} to="/training/scenarios" search={{ id: s.id }} className="border bg-card p-4 hover:border-primary">
            <div className="font-semibold text-sm">{s.title}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{s.category}</div>
            <p className="text-xs text-muted-foreground mt-2">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
