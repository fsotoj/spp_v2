import { TYPE_COLORS, type Var } from '../../data/methodology';

export function VarTable({ vars }: { vars: Var[] }) {
    return (
        <div className="space-y-0 my-4 divide-y divide-slate-50">
            {vars.map(v => (
                <div key={v.name} id={`var-${v.name}`} className="flex items-start gap-3 py-2.5 scroll-mt-28">
                    <code className="text-[11px] px-2 py-1 rounded font-mono flex-shrink-0 mt-0.5 bg-slate-100 text-slate-700 whitespace-nowrap">
                        {v.name}
                    </code>
                    <div className="flex-1 min-w-0">
                        <span className={`inline-block text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded mr-2 ${TYPE_COLORS[v.type] ?? 'bg-slate-100 text-slate-500'}`}>
                            {v.type}
                        </span>
                        <span className="text-sm text-slate-600">{v.desc}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
