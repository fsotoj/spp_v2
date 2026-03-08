import { useRef, useState } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useTranslation } from 'react-i18next';
import { PaperMapRenderer, ALTERNATIVE_PALETTES } from './PaperMapRenderer';

const PALETTE_OPTIONS = [
    { id: 'default', labelKey: 'plot.paletteDefault' },
    { id: 'YlGnBu', labelKey: 'plot.paletteYlGnBu' },
    { id: 'Reds', labelKey: 'plot.paletteReds' },
    { id: 'Blues', labelKey: 'plot.paletteBlues' },
    { id: 'Purples', labelKey: 'plot.palettePurples' },
    { id: 'Viridis', labelKey: 'plot.paletteViridis' },
    { id: 'Grays', labelKey: 'plot.paletteGrays' },
];

interface MapPlotModalProps {
    features: any[];
    obsData: Record<number, any>;
    year: number;
    variable: string;
    vType: string;
    defaultPalette: string | null | undefined;
    prettyName?: string | null;
    partyColors?: Record<string, string>;
    hiddenIndices: number[];
    hiddenNA: boolean;
    onClose: () => void;
}

export function MapPlotModal({
    features, obsData, year, variable, vType, defaultPalette,
    prettyName, partyColors, hiddenIndices, hiddenNA, onClose,
}: MapPlotModalProps) {
    const { t } = useTranslation();
    const previewRef = useRef<HTMLDivElement>(null);

    const [paletteOverride, setPaletteOverride] = useState<string>('default');
    const [applyFilters, setApplyFilters] = useState(false);
    const [mapTitle, setMapTitle] = useState('');
    const [showStateLabels, setShowStateLabels] = useState(false);
    const [showValueLabels, setShowValueLabels] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const hasActiveFilters = hiddenIndices.length > 0 || hiddenNA;

    const handleDownload = async () => {
        if (!previewRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(previewRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: 'white',
            });
            const link = document.createElement('a');
            link.download = `SPP_Map_${variable}_${year}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('[MapPlotModal] PNG export failed:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const PaletteSwatch = ({ id }: { id: string }) => {
        const raw = id === 'default' ? defaultPalette : ALTERNATIVE_PALETTES[id];
        if (!raw) return <span className="text-slate-400 text-[9px] italic">auto</span>;
        const colors = raw.split(',').map(c => c.trim());
        return (
            <div className="flex h-3 rounded overflow-hidden flex-1 border border-slate-200">
                {colors.map((c, i) => <div key={i} style={{ background: c, flex: 1 }} />)}
            </div>
        );
    };

    const LabelToggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
        <button
            onClick={() => onChange(!checked)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors w-full ${checked ? 'bg-brand-50 ring-1 ring-brand-400' : 'hover:bg-slate-50'}`}
        >
            <span className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${checked ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}>
                {checked && <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span className={`text-[11px] font-semibold ${checked ? 'text-brand-700' : 'text-slate-600'}`}>{label}</span>
        </button>
    );

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[95vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <Printer size={18} className="text-brand-600" />
                        <h2 className="text-base font-bold text-slate-800">{t('plot.title')}</h2>
                        <span className="text-xs text-slate-400 font-medium">{prettyName || variable} · {year}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">

                    {/* Config panel */}
                    <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-5 overflow-y-auto shrink-0">

                        {/* Palette */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                {t('plot.colorPalette')}
                            </label>
                            <div className="flex flex-col gap-1.5">
                                {PALETTE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setPaletteOverride(opt.id)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${paletteOverride === opt.id ? 'bg-brand-50 ring-1 ring-brand-400' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="w-20 shrink-0">
                                            <PaletteSwatch id={opt.id} />
                                        </div>
                                        <span className={`text-[11px] font-semibold truncate ${paletteOverride === opt.id ? 'text-brand-700' : 'text-slate-600'}`}>
                                            {t(opt.labelKey)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter toggle */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                {t('plot.stateVisibility')}
                            </label>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={() => setApplyFilters(false)}
                                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-colors ${!applyFilters ? 'bg-brand-50 ring-1 ring-brand-400' : 'hover:bg-slate-50'}`}
                                >
                                    <span className={`w-3.5 h-3.5 mt-0.5 rounded-full border-2 shrink-0 ${!applyFilters ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`} />
                                    <span className={`text-[11px] font-semibold leading-tight ${!applyFilters ? 'text-brand-700' : 'text-slate-600'}`}>
                                        {t('plot.showAll')}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setApplyFilters(true)}
                                    disabled={!hasActiveFilters}
                                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${applyFilters ? 'bg-brand-50 ring-1 ring-brand-400' : 'hover:bg-slate-50'}`}
                                    title={!hasActiveFilters ? t('plot.noFiltersActive') : undefined}
                                >
                                    <span className={`w-3.5 h-3.5 mt-0.5 rounded-full border-2 shrink-0 ${applyFilters ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`} />
                                    <span className={`text-[11px] font-semibold leading-tight ${applyFilters ? 'text-brand-700' : 'text-slate-600'}`}>
                                        {t('plot.applyFilters')}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Labels */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                {t('plot.labelsSection')}
                            </label>
                            <div className="flex flex-col gap-1.5">
                                <LabelToggle
                                    checked={showStateLabels}
                                    onChange={setShowStateLabels}
                                    label={t('plot.stateNames')}
                                />
                                <LabelToggle
                                    checked={showValueLabels}
                                    onChange={setShowValueLabels}
                                    label={t('plot.variableValues')}
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                {t('plot.mapTitleLabel')}
                            </label>
                            <input
                                type="text"
                                value={mapTitle}
                                onChange={e => setMapTitle(e.target.value)}
                                placeholder={t('plot.mapTitlePlaceholder')}
                                className="w-full text-[12px] border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 text-slate-700 placeholder-slate-300"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-5 pt-4 pb-2">
                            {t('plot.preview')}
                        </div>
                        <div className="flex-1 px-5 pb-4 min-h-0">
                            <div
                                ref={previewRef}
                                className="w-full h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-white"
                            >
                                <PaperMapRenderer
                                    features={features}
                                    obsData={obsData}
                                    variable={variable}
                                    vType={vType}
                                    defaultPalette={defaultPalette}
                                    paletteOverride={paletteOverride}
                                    prettyName={prettyName}
                                    partyColors={partyColors}
                                    applyFilters={applyFilters}
                                    hiddenIndices={hiddenIndices}
                                    hiddenNA={hiddenNA}
                                    mapTitle={mapTitle}
                                    showStateLabels={showStateLabels}
                                    showValueLabels={showValueLabels}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        {t('plot.cancel')}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        <Download size={14} />
                        {isDownloading ? t('plot.downloading') : t('plot.downloadPng')}
                    </button>
                </div>
            </div>
        </div>
    );
}
