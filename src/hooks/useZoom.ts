import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useSelection } from '@/contexts/SelectionContext';

export const useZoom = (ref: React.MutableRefObject<HTMLDivElement | null>, isCustomView?: boolean) => {

    // State to hold the zoom level
    let zoomableRef = useRef<HTMLDivElement | null>(null);
    const { zoom, setZoom } = useSelection();
    const zoomRef = useRef(1);
    const mousePosition = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (ref.current) {
            ref.current.addEventListener('wheel', handleWheel);
            ref.current.addEventListener('mousemove', handleMove);
        }

        // Clean up
        return () => {
            if (ref.current) {
                ref.current.removeEventListener('wheel', handleWheel);
                ref.current.removeEventListener('mousemouse', handleMove);
            }
        };
    }, [zoom, setZoom, isCustomView]);

    const handleMove = (e: any) => {
        mousePosition.current = {
            x: e.clientX,
            y: e.clientY
        };
    };


    // Function to handle the mouse wheel event
    const handleWheel = useCallback((event: WheelEvent) => {
        if (isCustomView) {
            return;
        }
        // You can customize the zoom factor as per your requirement
        if (!ref.current || !zoomableRef.current) {
            return;
        }
        let editor = ref.current;

        if (event.ctrlKey) {
            event.preventDefault();
            const zoomFactor = 0.05;

            // Get the mouse position relative to the div
            const rect = editor.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Calculate the position in the non-zoomed coordinate system
            const preZoomX = (mouseX + editor.scrollLeft) / zoomRef.current;
            const preZoomY = (mouseY + editor.scrollTop) / zoomRef.current;

            // Apply zoom
            let newZoom = event.deltaY < 0 ? Math.min(zoom + zoomFactor, 5) :
                Math.max(zoom - zoomFactor, 0.5);

            if (newZoom > 0.6 && newZoom < 1) {
                newZoom = 1;
            }
            setZoom(newZoom);
            zoomRef.current = newZoom;

            // Calculate the new scroll position to keep the cursor over the same area
            const newScrollLeft = preZoomX * newZoom - mouseX;
            const newScrollTop = preZoomY * newZoom - mouseY;

            // Apply the new scroll position
            requestAnimationFrame(() => {
                if (zoomableRef.current) {
                    zoomableRef.current.style.transform = "scale(" + newZoom + ")";
                    zoomableRef.current.style.transformOrigin = "top left";
                    editor.scrollLeft = newScrollLeft;
                    editor.scrollTop = newScrollTop;
                }
            });
        } else {
        }
    }, [setZoom, zoom, isCustomView]);

    return { zoom, zoomableRef, zoomRef };
};
