import React from 'react';

export function UseCaseCard({
    icon, title, description, color
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'orange' | 'slate' | 'brand' | 'amber';
}) {
    const iconStyles = {
        orange: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
        slate:  "bg-gradient-to-br from-slate-600 to-slate-900 text-white",
        brand:  "bg-gradient-to-br from-brand-400 to-brand-600 text-white",
        amber:  "bg-gradient-to-br from-amber-300 to-amber-500 text-white",
    };
    const barStyles = {
        orange: "from-amber-400 to-orange-500",
        slate:  "from-slate-600 to-slate-900",
        brand:  "from-brand-400 to-brand-600",
        amber:  "from-amber-300 to-amber-500",
    };

    return (
        <div className="group relative bg-white p-4 lg:p-5 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 flex flex-row items-center sm:items-start gap-4">
            <div className={`w-12 h-12 rounded-xl shrink-0 ${iconStyles[color]} flex items-center justify-center shadow-md`}>
                {icon}
            </div>
            <div className="flex flex-col flex-1">
                <h3 className="text-sm font-black text-slate-900 mb-1 leading-snug">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{description}</p>
                <div className={`w-0 h-1 bg-gradient-to-r ${barStyles[color]} mt-2 sm:mt-3 rounded-full opacity-30 group-hover:opacity-100 group-hover:w-8 transition-all duration-500`} />
            </div>
        </div>
    );
}
