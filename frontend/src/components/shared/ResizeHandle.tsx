import { useRef, useEffect, useCallback } from 'react';

interface ResizeHandleProps {
    direction: 'horizontal' | 'vertical';
    onDelta: (delta: number) => void;
}

/**
 * An invisible drag handle that calls onDelta with the mouse movement delta
 * in the relevant axis. Attach between two resizable panels.
 *
 * direction='horizontal'  → dragging left/right changes width of adjacent panels
 * direction='vertical'    → dragging up/down changes height of adjacent panels
 */
export function ResizeHandle({ direction, onDelta }: ResizeHandleProps) {
    const dragging = useRef(false);
    const lastPos = useRef(0);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!dragging.current) return;
        const pos = direction === 'horizontal' ? e.clientX : e.clientY;
        const delta = pos - lastPos.current;
        lastPos.current = pos;
        onDelta(delta);
    }, [direction, onDelta]);

    const stopDrag = useCallback(() => {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', stopDrag);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', stopDrag);
        };
    }, [onMouseMove, stopDrag]);

    const startDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
        document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    };

    const isH = direction === 'horizontal';

    return (
        <div
            onMouseDown={startDrag}
            className={`group shrink-0 flex items-center justify-center transition-colors hover:bg-brand-100 active:bg-brand-200 ${
                isH
                    ? 'w-1.5 h-full cursor-col-resize'
                    : 'h-1.5 w-full cursor-row-resize'
            }`}
            style={{ zIndex: 10 }}
        >
            {/* Visual grip dots */}
            <div className={`flex opacity-0 group-hover:opacity-60 transition-opacity ${isH ? 'flex-col gap-1' : 'flex-row gap-1'}`}>
                {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-spp-gray" />
                ))}
            </div>
        </div>
    );
}
