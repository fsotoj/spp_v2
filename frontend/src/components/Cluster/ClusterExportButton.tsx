import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useTranslation } from 'react-i18next';
import { CLUSTER_COLORS, CLUSTER_LABELS, type ClusterAssignment, type StateVector } from '../../services/clusterService';
import type { VariableDict } from '../../api/hooks';

interface ClusterExportButtonProps {
    mapRef: React.RefObject<HTMLDivElement>;
    chartRef: React.RefObject<HTMLDivElement>;
    assignments: ClusterAssignment[];
    stateVectors: StateVector[];
    variables: string[];
    variableMeta: VariableDict[];
    lang: string;
    varTitle: string;
    year: number;
    algorithm: string;
    clusterK: number;
    disabled?: boolean;
}

export function ClusterExportButton({
    mapRef, chartRef,
    assignments, stateVectors, variables, variableMeta,
    lang, varTitle, year, algorithm, clusterK,
    disabled,
}: ClusterExportButtonProps) {
    const { t } = useTranslation();
    const [isExporting, setIsExporting] = useState(false);

    const getVarLabel = (v: string) => {
        const meta = variableMeta.find(m => m.variable === v);
        if (!meta) return v;
        return lang === 'de' ? (meta.pretty_name_de || meta.pretty_name || v)
            : lang === 'es' ? (meta.pretty_name_es || meta.pretty_name || v)
                : lang === 'pt' ? (meta.pretty_name_pt || meta.pretty_name || v)
                    : (meta.pretty_name || v);
    };

    const hexToRgb = (hex: string): [number, number, number] => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];

    const handleExport = async () => {
        if (!mapRef.current || !chartRef.current || !assignments.length) return;
        setIsExporting(true);

        try {
            // ── Capture map (no basemap tiles) ──────────────────────────────
            const tilePane = mapRef.current.querySelector('.leaflet-tile-pane') as HTMLElement | null;
            const shadowPane = mapRef.current.querySelector('.leaflet-shadow-pane') as HTMLElement | null;
            if (tilePane) tilePane.style.visibility = 'hidden';
            if (shadowPane) shadowPane.style.visibility = 'hidden';

            const mapPng = await toPng(mapRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: '#f8fafc',
            });

            if (tilePane) tilePane.style.visibility = '';
            if (shadowPane) shadowPane.style.visibility = '';

            // ── Capture chart panel ──────────────────────────────────────────
            const chartPng = await toPng(chartRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: 'white',
            });

            // ── Build PDF ────────────────────────────────────────────────────
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const W = doc.internal.pageSize.getWidth();   // 297
            const H = doc.internal.pageSize.getHeight();  // 210
            const ML = 12;
            const MR = 12;
            const MT = 12;
            const contentW = W - ML - MR;

            // ── Header ──────────────────────────────────────────────────────
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(30, 30, 30);
            doc.text('Subnational Politics Project — Cluster Analysis', ML, MT + 5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `${varTitle}  ·  ${year}  ·  ${algorithm.toUpperCase()}  ·  k = ${clusterK}`,
                ML, MT + 10,
            );
            doc.text(
                `${new Date().toISOString().slice(0, 10)}  ·  spp.site`,
                ML, MT + 14,
            );

            doc.setDrawColor(220, 220, 220);
            doc.line(ML, MT + 17, W - MR, MT + 17);

            // ── Map + Chart ──────────────────────────────────────────────────
            const visTop = MT + 20;
            const mapW = contentW * 0.62;
            const chartW = contentW * 0.36;
            const visH = 90;

            doc.addImage(mapPng, 'PNG', ML, visTop, mapW, visH, undefined, 'FAST');
            doc.addImage(chartPng, 'PNG', ML + mapW + contentW * 0.02, visTop, chartW, visH, undefined, 'FAST');

            // ── Results Table ────────────────────────────────────────────────
            const ROW_H = 5.2;
            const varLabels = variables.map(v => {
                const lbl = getVarLabel(v);
                return lbl.length > 13 ? lbl.slice(0, 12) + '…' : lbl;
            });
            const COL_CLUSTER = 12;
            const COL_STATE = 38;
            const COL_COUNTRY = 26;
            const colVarW = Math.max(14, (contentW - COL_CLUSTER - COL_STATE - COL_COUNTRY) / Math.max(variables.length, 1));
            const colWidths = [COL_CLUSTER, COL_STATE, COL_COUNTRY, ...variables.map(() => colVarW)];
            const headers = [t('cluster.cluster'), t('popup.state'), 'Country', ...varLabels];

            let y = visTop + visH + 6;

            // Header row
            doc.setFillColor(240, 242, 245);
            doc.rect(ML, y, contentW, ROW_H, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(70, 70, 70);
            let x = ML;
            headers.forEach((h, i) => {
                doc.text(h, x + 1.5, y + ROW_H - 1.5);
                x += colWidths[i];
            });
            y += ROW_H;

            // Data rows
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            let lastCluster = '';
            let rowIdx = 0;

            CLUSTER_LABELS.forEach(label => {
                const rows = assignments.filter(a => a.cluster === label);
                rows.forEach(a => {
                    if (y + ROW_H > H - 8) {
                        doc.addPage();
                        y = 14;
                    }

                    // Cluster colour cell
                    if (label !== lastCluster) {
                        lastCluster = label;
                        const ci = CLUSTER_LABELS.indexOf(label);
                        const [r, g, b] = hexToRgb(CLUSTER_COLORS[ci] ?? '#94a3b8');
                        doc.setFillColor(r, g, b);
                        doc.rect(ML, y, COL_CLUSTER, ROW_H, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFont('helvetica', 'bold');
                        doc.text(label, ML + 1.5, y + ROW_H - 1.5);
                    }

                    // Alternating background for state columns
                    if (rowIdx % 2 === 0) {
                        doc.setFillColor(250, 250, 252);
                        doc.rect(ML + COL_CLUSTER, y, contentW - COL_CLUSTER, ROW_H, 'F');
                    }

                    doc.setTextColor(40, 40, 40);
                    doc.setFont('helvetica', 'normal');
                    const sv = stateVectors.find(s => s.stateId === a.stateId);
                    const cells = [
                        sv?.stateName ?? String(a.stateId),
                        sv?.countryName ?? '',
                        ...variables.map((_, vi) => {
                            const val = sv?.rawMeans[vi];
                            return val != null && !isNaN(Number(val)) ? Number(val).toFixed(2) : '–';
                        }),
                    ];
                    x = ML + COL_CLUSTER;
                    cells.forEach((cell, i) => {
                        doc.text(String(cell), x + 1.5, y + ROW_H - 1.5);
                        x += colWidths[i + 1];
                    });

                    doc.setDrawColor(230, 230, 230);
                    doc.line(ML, y + ROW_H, ML + contentW, y + ROW_H);
                    y += ROW_H;
                    rowIdx++;
                });
            });

            doc.save(`SPP_Cluster_${year}.pdf`);
        } catch (err) {
            console.error('[ClusterExportButton] PDF export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const isDisabled = disabled || isExporting;

    return (
        <button
            onClick={handleExport}
            disabled={isDisabled}
            title={t('cluster.exportPdf')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-sm transition-all ${isDisabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-spp-bgLight border border-slate-200 text-spp-textDark hover:bg-slate-50 shadow-sm'
                }`}
        >
            <FileDown size={14} />
            {isExporting ? t('cluster.exporting') : t('cluster.exportPdf')}
        </button>
    );
}
