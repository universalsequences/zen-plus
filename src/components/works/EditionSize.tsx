import React, { useEffect, useCallback, useRef } from 'react';

const EditionSize: React.FC<{ setEditionSize: (x: number) => void, editionSize: number, maxEditionSize: number }> = ({
    setEditionSize,
    editionSize,
    maxEditionSize
}) => {

    let isMouseDown = useRef(false);

    const onMouseDown = useCallback((e: any) => {
        isMouseDown.current = true;
    }, []);

    useEffect(() => {
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchend", onMouseUp);
        return () => {
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchend", onMouseUp);
        }
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("touchmove", onMouseMove);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("touchmove", onMouseMove);
        }
    }, []);


    let ref = useRef<HTMLDivElement>(null);

    const onMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isMouseDown.current || !ref.current) return;
        let clientX = 0;
        if ((e as TouchEvent).touches) {
            clientX = (e as TouchEvent).touches[0].clientX;
        } else {
            clientX = (e as MouseEvent).clientX;
        }
        let x = clientX - ref.current.getBoundingClientRect().left
        let size = Math.floor((x / (0.9 * ref.current.offsetWidth)) * 11);
        setEditionSize(Math.max(1, Math.min(11, size)));
    }, [setEditionSize]);

    const onMouseUp = useCallback((e: MouseEvent | TouchEvent) => {
        isMouseDown.current = false;
    }, []);

    return (
        <div className="mt-3">
            <div ref={ref} className="w-56 h-8 rounded-lg  flex bg-zinc-800 relative">
                <div
                    onMouseDown={onMouseDown}
                    onTouchStart={onMouseDown}
                    style={{ left: 85 * ((editionSize - 1) / 11) + '%' }}
                    className="w-12 h-12 rounded-xl border-4 border-black bg-zinc-300 absolute -bottom-2 z-3 active:bg-zinc-300 transition-colors cursor-pointer active:scale-95">
                </div>
                <div
                    onMouseDown={onMouseDown}
                    onTouchStart={onMouseDown}
                    style={{
                        backgroundImage: " linear-gradient( 89.7deg, rgba(223,0,0,1) 5px, rgba(214,91,0,1) 50.1px, rgba(233,245,0,1) 100.5px, rgba(23,255,17,1) 150px, rgba(29,255,255,1) 461.5px, rgba(5,17,255,1) 676.4px, rgba(202,0,253,1) 692.4px )",
                        width: 85 * ((editionSize - 1) / 11) + '%'
                    }}
                    className=" h-8  absolute bottom-0 z-1 rounded-lg">
                </div>
            </div>
        </div>
    );
};

export default EditionSize;
