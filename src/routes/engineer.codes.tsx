import { createFileRoute } from '@tanstack/react-router';
import { CODES } from '@/services/codes/library';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export const Route = createFileRoute('/engineer/codes')({
  component: Codes,
});

function Codes() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => CODES.filter((c) => (c.name + c.scope + c.summary + c.applicability.join(' ')).toLowerCase().includes(q.toLowerCase())), [q]);
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code, topic, or scope…" className="w-full pl-7 pr-2 py-1.5 border bg-card rounded-sm text-sm" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((c) => (
          <div key={c.id} className="border bg-card p-4 border-l-4 border-l-primary">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold">{c.name}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{c.scope}</div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.applicability.map((a) => <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded-sm">{a}</span>)}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">Related: {c.relatedModules.join(', ')}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground italic">Summaries only — refer to the published standard for engineering use.</div>
    </div>
  );
}
