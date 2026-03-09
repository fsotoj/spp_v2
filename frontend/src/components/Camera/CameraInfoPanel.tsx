import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { toTitleCase, type ChamberMeta, type StateObservation } from './CameraUtils';

interface CameraInfoPanelProps {
    chamberMeta: ChamberMeta | null;
    stateObs: StateObservation | null;
}

export const CameraInfoPanel: React.FC<CameraInfoPanelProps> = ({ chamberMeta, stateObs }) => {
    const { t } = useTranslation();
    const [isLegisExpanded, setIsLegisExpanded] = useState(true);
    const [isGovExpanded, setIsGovExpanded] = useState(false);

    if (!chamberMeta) return null;

    const RENEWAL: Record<string, string> = {
        '1': t('popup.staggeredEvery2Years'),
        '2': t('popup.fullRenewal'),
    };
    const SYSTEM: Record<string, string> = {
        '1': t('popup.proportionalRepresentation'),
        '2': t('popup.simpleMajority'),
        '3': t('popup.mixedPRMajority'),
        '4': t('popup.mixedPRDistricts'),
    };
    const fmt = (v: any) => v != null ? String(v) : '—';
    const fmtNum = (v: any) => v != null && !isNaN(Number(v)) ? Number(v).toFixed(2) : '—';
    const fmtCode = (map: Record<string, string>, v: any) =>
        v != null ? (map[String(Math.round(Number(v)))] ?? fmt(v)) : '—';

    const rows: [string, string][] = [
        [t('camera.seatsInContest'), fmt(chamberMeta.seatsInContest)],
        [t('camera.renewalType'), fmtCode(RENEWAL, chamberMeta.renewalType)],
        [t('camera.electoralSystem'), fmtCode(SYSTEM, chamberMeta.electoralSystem)],
        [t('camera.partiesContesting'), fmt(chamberMeta.partiesContesting)],
        [t('camera.enpl'), fmtNum(chamberMeta.enpl)],
    ];

    return (
        <div className="flex-1 md:flex-none w-1/2 md:w-auto flex flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden md:min-h-0">
            {/* Info Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <h3 className="font-black text-[10px] text-brand-600 uppercase tracking-[0.12em]">
                    {t('popup.details', { defaultValue: 'DETAILS' })}
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                <div className="flex flex-col">
                    {/* Legislative Toggle */}
                    <button
                        onClick={() => setIsLegisExpanded(p => !p)}
                        className="w-full flex justify-between items-center px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-spp-gray hover:bg-slate-50 transition-colors"
                    >
                        {t('popup.legislativeDetails')}
                        {isLegisExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {isLegisExpanded && (
                        <div className="px-3 py-2 bg-slate-50/50 space-y-1">
                            {rows.map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-1">
                                    <span className="text-[9px] font-bold text-spp-gray leading-tight shrink-0">{label}</span>
                                    <span className="text-[9px] font-semibold text-spp-textDark text-right leading-tight">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Governor Toggle */}
                    <button
                        onClick={() => setIsGovExpanded(p => !p)}
                        className="w-full flex justify-between items-center px-4 py-2 border-t border-slate-100 text-[10px] font-bold uppercase tracking-wider text-spp-gray hover:bg-slate-50 transition-colors"
                    >
                        {t('popup.governorDetails')}
                        {isGovExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {isGovExpanded && (
                        <div className="px-3 py-2 bg-slate-50/50 space-y-1">
                            <div className="flex justify-between gap-1">
                                <span className="text-[9px] font-bold text-spp-gray leading-tight shrink-0">{t('popup.governor')}</span>
                                <span className="text-[9px] font-semibold text-spp-textDark text-right leading-tight truncate max-w-[100px]" title={stateObs?.winner_candidate_sub_exe ?? stateObs?.name_head_sub_exe}>
                                    {toTitleCase(stateObs?.winner_candidate_sub_exe ?? stateObs?.name_head_sub_exe)}
                                </span>
                            </div>
                            <div className="flex justify-between gap-1">
                                <span className="text-[9px] font-bold text-spp-gray leading-tight shrink-0">{t('popup.party')}</span>
                                <span className="text-[9px] font-semibold text-spp-textDark text-right leading-tight truncate max-w-[100px]" title={stateObs?.head_party_sub_exe}>
                                    {toTitleCase(stateObs?.head_party_sub_exe)}
                                </span>
                            </div>
                            <div className="flex justify-between gap-1">
                                <span className="text-[9px] font-bold text-spp-gray leading-tight shrink-0">{t('popup.reelected')}</span>
                                <span className="text-[9px] font-semibold text-spp-textDark text-right leading-tight">
                                    {stateObs?.consecutive_reelection_sub_exe === 1 ? t('popup.yes') : t('popup.no')}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
