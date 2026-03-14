interface YearRangeSliderProps {
    yearMin: number;
    yearMax: number;
    globalYearMin: number;
    globalYearMax: number;
    onYearMinChange: (y: number) => void;
    onYearMaxChange: (y: number) => void;
}

export function YearRangeSlider({
    yearMin,
    yearMax,
    globalYearMin,
    globalYearMax,
    onYearMinChange,
    onYearMaxChange,
}: YearRangeSliderProps) {
    const range = globalYearMax - globalYearMin;
    const leftPct = ((yearMin - globalYearMin) / range) * 100;
    const rightPct = ((yearMax - globalYearMin) / range) * 100;

    return (
        <div className="relative h-10 flex items-center">
            <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full" />
            <div
                className="absolute h-2 bg-brand-400 rounded-full"
                style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
            />
            <input
                type="range"
                min={globalYearMin}
                max={globalYearMax}
                value={yearMin}
                onChange={e => {
                    const v = Number(e.target.value);
                    if (v <= yearMax) onYearMinChange(v);
                }}
                className="absolute w-full h-2 appearance-none bg-transparent [pointer-events:none] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer accent-brand-600 focus:outline-none"
                style={{ zIndex: 5 }}
            />
            <input
                type="range"
                min={globalYearMin}
                max={globalYearMax}
                value={yearMax}
                onChange={e => {
                    const v = Number(e.target.value);
                    if (v >= yearMin) onYearMaxChange(v);
                }}
                className="absolute w-full h-2 appearance-none bg-transparent [pointer-events:none] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer accent-brand-600 focus:outline-none"
                style={{ zIndex: 5 }}
            />
        </div>
    );
}
