import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, GripVertical } from 'lucide-react';
import { toPng } from 'html-to-image';
import { HemicycleChart, type PartyRow } from './HemicycleChart';
import { toPartyTitleCase } from './CameraUtils';

// 'corner' = small legend overlaid on chart top-right (chart unaffected)
// 'sidebar' = legend as right-side panel (chart shrinks)
export type LegendLayout = 'corner' | 'sidebar';

type FontSize = 'sm' | 'md' | 'lg';
const FONT_SIZES: { id: FontSize; label: string; cls: string }[] = [
    { id: 'sm', label: 'S', cls: 'text-[7px]'  },
    { id: 'md', label: 'M', cls: 'text-[9px]'  },
    { id: 'lg', label: 'L', cls: 'text-[11px]' },
];

interface CameraPrintViewProps {
    chartParties: PartyRow[];
    legendParties: PartyRow[];
    title: string;
    subtitle: string;
    chamberLabel: string;
    coalitionsGrouped: boolean;
    layout: LegendLayout;
    onChangeLayout: (l: LegendLayout) => void;
    onClose: () => void;
}

export const CameraPrintView: React.FC<CameraPrintViewProps> = ({
    chartParties,
    legendParties,
    title,
    subtitle,
    chamberLabel,
    coalitionsGrouped,
    layout,
    onChangeLayout,
    onClose,
}) => {
    const year = new Date().getFullYear();

    // Drag state — only active in corner mode
    const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    // Font size — local to the dialog
    const [fontSize, setFontSize] = useState<FontSize>('md');
    const [isDownloading, setIsDownloading] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const legendRef  = useRef<HTMLDivElement>(null);

    // Reset drag position when layout changes
    useEffect(() => { setDragPos(null); }, [layout]);

    useEffect(() => {
        if (!isDragging) return;
        document.body.style.cursor     = 'grabbing';
        document.body.style.userSelect = 'none';
        return () => {
            document.body.style.cursor     = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (layout !== 'corner') return;
        e.preventDefault();
        if (!contentRef.current || !legendRef.current) return;

        const cr = contentRef.current.getBoundingClientRect();
        const lr = legendRef.current.getBoundingClientRect();
        const offsetX = e.clientX - lr.left;
        const offsetY = e.clientY - lr.top;

        setDragPos({ x: lr.left - cr.left, y: lr.top - cr.top });
        setIsDragging(true);

        const onMove = (ev: MouseEvent) => {
            if (!contentRef.current || !legendRef.current) return;
            const cr2 = contentRef.current.getBoundingClientRect();
            const lr2 = legendRef.current.getBoundingClientRect();
            setDragPos({
                x: Math.max(0, Math.min(cr2.width  - lr2.width,  ev.clientX - cr2.left - offsetX)),
                y: Math.max(0, Math.min(cr2.height - lr2.height, ev.clientY - cr2.top  - offsetY)),
            });
        };
        const onUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup',   onUp);
    }, [layout]);

    const handleDownload = async () => {
        if (!contentRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(contentRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: 'white',
            });
            const link = document.createElement('a');
            link.download = `SPP_Hemicycle_${[title, subtitle].filter(Boolean).join('_').replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('[CameraPrintView] PNG export failed:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const fontCls = FONT_SIZES.find(f => f.id === fontSize)!.cls;

    // ── Legend panel (shared inner content) ───────────────────────────────
    const legendInner = (
        <>
            {/* Header / drag handle */}
            <div
                className={`px-2.5 py-1.5 border-b border-brand-100 bg-spp-bgMuted flex items-center gap-1 ${layout === 'corner' ? 'cursor-grab' : ''}`}
                onMouseDown={layout === 'corner' ? handleDragStart : undefined}
            >
                {layout === 'corner' && <GripVertical size={9} className="text-brand-300 shrink-0" />}
                <span className={`${fontCls} font-black text-brand-600 uppercase tracking-widest flex-1 select-none`}>
                    {chamberLabel}
                </span>
            </div>

            {coalitionsGrouped && (
                <div className="flex items-center gap-1 px-2.5 py-1 border-b border-brand-100 bg-brand-50">
                    <i className="w-1.5 h-1.5 rounded-full shrink-0 ring-2 ring-brand-400 ring-offset-[1px] bg-brand-200" />
                    <span className={`${fontCls} text-brand-700 font-bold uppercase tracking-wider`}>= Coalition</span>
                </div>
            )}

            {/* Party rows */}
            <div className={`flex flex-col ${layout === 'sidebar' ? 'flex-1 overflow-y-auto' : 'overflow-y-auto max-h-64'} px-2 py-1 gap-y-0`}>
                {legendParties.map(p => (
                    <div key={p.party_name} className="flex items-center gap-1.5 py-[1px] min-w-0">
                        <i
                            className={`w-2 h-2 rounded-full shrink-0 ${coalitionsGrouped && p.is_coalition === 1 ? 'ring-2 ring-brand-400 ring-offset-[1px]' : ''}`}
                            style={{ background: p.color }}
                        />
                        <span className={`${fontCls} text-spp-textDark truncate flex-1`}>
                            {toPartyTitleCase(p.party_name)}
                        </span>
                        <span className={`${fontCls} font-black text-brand-600 pl-1 shrink-0`}>
                            {p.seats}
                        </span>
                    </div>
                ))}
            </div>
        </>
    );

    // ── Two legend renderings ─────────────────────────────────────────────

    // CORNER: absolute overlay, draggable, defaults to top-right
    const cornerLegend = (
        <div
            ref={legendRef}
            className={`absolute z-10 w-44 flex flex-col border border-brand-100 rounded-xl bg-white/95 overflow-hidden select-none ${isDragging ? 'shadow-2xl' : 'shadow-md'}`}
            style={dragPos
                ? { left: dragPos.x, top: dragPos.y, cursor: isDragging ? 'grabbing' : 'grab' }
                : { top: 12, right: 12 }
            }
        >
            {legendInner}
        </div>
    );

    // SIDEBAR: right flex panel, no drag
    const sidebarLegend = (
        <div
            ref={legendRef}
            className="w-52 shrink-0 flex flex-col border-l border-brand-100 bg-spp-bgLight overflow-hidden"
        >
            {legendInner}
        </div>
    );

    // ── View ──────────────────────────────────────────────────────────────
    const view = (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">

            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[95vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <Download size={18} className="text-brand-600" />
                        <h2 className="text-base font-bold text-slate-800">Export preview</h2>
                        <span className="text-xs text-slate-400 font-medium">
                            {title}{subtitle ? ` · ${subtitle}` : ''}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">

                    {/* Config panel */}
                    <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-5 shrink-0">

                        {/* Layout */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Layout</label>
                            <div className="flex flex-col gap-1">
                                {([
                                    { id: 'corner',  label: 'Corner overlay' },
                                    { id: 'sidebar', label: 'Side panel'     },
                                ] as { id: LegendLayout; label: string }[]).map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => onChangeLayout(opt.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                            layout === opt.id ? 'bg-brand-50 ring-1 ring-brand-400' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className={`text-[11px] font-semibold ${layout === opt.id ? 'text-brand-700' : 'text-slate-600'}`}>
                                            {opt.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {layout === 'corner' && (
                                <p className="flex items-center gap-1 text-[9px] text-slate-400 mt-2 italic">
                                    <GripVertical size={9} />
                                    Drag legend in preview
                                </p>
                            )}
                        </div>

                        {/* Font size */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Legend text</label>
                            <div className="flex gap-1">
                                {FONT_SIZES.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setFontSize(f.id)}
                                        className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                                            fontSize === f.id ? 'bg-brand-50 ring-1 ring-brand-400 text-brand-700' : 'hover:bg-slate-50 text-slate-500'
                                        } text-[11px] font-bold`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Preview — captured as PNG */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-5 pt-4 pb-1 shrink-0">Preview</div>

                        <div
                            ref={contentRef}
                            className="relative flex overflow-hidden bg-white"
                            style={{ minHeight: '420px', flex: '1 1 0' }}
                        >
                            {/* Chart always fills remaining flex space */}
                            <div className="flex-1 relative min-w-0">
                                <div className="absolute inset-5">
                                    <HemicycleChart
                                        parties={chartParties}
                                        highlightedParty={null}
                                        onPartyHover={() => {}}
                                        title={title}
                                        subtitle={subtitle}
                                        coalitionsGrouped={coalitionsGrouped}
                                    />
                                </div>
                            </div>

                            {/* Legend: corner overlay or sidebar */}
                            {layout === 'corner'  && cornerLegend}
                            {layout === 'sidebar' && sidebarLegend}

                            {/* Attribution */}
                            <div
                                className="absolute bottom-3 left-3 z-20 bg-white/80 px-2 py-0.5 rounded text-[9px] text-slate-400 italic"
                                style={{ pointerEvents: 'none' }}
                            >
                                Subnational Politics Project · {year}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        <Download size={14} />
                        {isDownloading ? 'Generating…' : 'Download PNG'}
                    </button>
                </div>

            </div>
        </div>
    );

    return createPortal(view, document.body);
};
