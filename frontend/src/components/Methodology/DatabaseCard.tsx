import { ExternalLink } from 'lucide-react';
import { type DATABASES } from '../../data/methodology';

type DB = typeof DATABASES[number];

interface Props {
    db: DB;
    t: (key: string) => string;
}

export function DatabaseCard({ db, t }: Props) {
    return (
        <div className="border border-slate-100 rounded-xl p-4 hover:border-brand-200 transition-colors">
            <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                    <span className="text-xs font-black text-brand-500 uppercase tracking-widest">{db.abbr}</span>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{t(db.nameKey)}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{t(db.descKey)}</div>
                </div>
                <a href={db.doi} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-brand-500 hover:text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2 py-1 rounded-lg transition-colors">
                    DOI <ExternalLink size={9} />
                </a>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-50 text-[11px] text-slate-500 leading-relaxed italic">
                {t(db.citationKey)}
            </div>
        </div>
    );
}
