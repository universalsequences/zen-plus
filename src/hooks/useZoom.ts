import React, { useCallback, useRef, useEffect } from 'react';
import { useSelection } from '@/contexts/SelectionContext';

/**
 * Hook that provides zoom functionality for a patch editor
 * 
 * This hook allows users to zoom in and out of the patch editor using Ctrl+wheel,
 * maintaining the cursor position as the focal point for zooming.
 * 
 * @param ref - Reference to the scrollable container element
 * @param isCustomView - Whether this is a custom view (which disables zooming)
 * @returns Zoom-related refs and state
 */
export const useZoom = (ref: React.MutableRefObject<HTMLDivElement | null>, isCustomView?: boolean) => {
  // Reference to the element that will be scaled
  const zoomableRef = useRef<HTMLDivElement | null>(null);
  
  // Get zoom state from selection context
  const { zoom, setZoom } = useSelection();
  
  // Keep a ref to the current zoom level for calculations
  const zoomRef = useRef(1);
  
  // Track mouse position
  const mousePosition = useRef({ x: 0, y: 0 });

  /**
   * Update stored mouse position on mousemove
   */
  const handleMove = useCallback((e: MouseEvent) => {
    mousePosition.current = {
      x: e.clientX,
      y: e.clientY
    };
  }, []);

  /**
   * Handle mouse wheel events for zooming
   * 
   * Zooms in or out when Ctrl key is pressed, preserving the position
   * under the cursor as the focal point for zoom.
   */
  const handleWheel = useCallback((event: WheelEvent) => {
    // Skip zooming in custom view
    if (isCustomView) {
      return;
    }
    
    // Skip if references are missing
    if (!ref.current || !zoomableRef.current) {
      return;
    }
    
    // Only process zoom with Ctrl key
    if (!event.ctrlKey) {
      return;
    }
    
    // Prevent default scrolling behavior
    event.preventDefault();
    
    const editor = ref.current;
    const zoomFactor = 0.05;

    // Get mouse position relative to the editor
    const rect = editor.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate the position in the non-zoomed coordinate system
    const preZoomX = (mouseX + editor.scrollLeft) / zoomRef.current;
    const preZoomY = (mouseY + editor.scrollTop) / zoomRef.current;

    // Calculate new zoom level based on wheel direction
    let newZoom = event.deltaY < 0 
      ? Math.min(zoom + zoomFactor, 5)  // Zoom in (up to max of 5x)
      : Math.max(zoom - zoomFactor, 0.3); // Zoom out (down to min of 0.3x)

    // Snap to 1.0 when close to it for easier reset to normal view
    if (newZoom > 0.6 && newZoom < 1) {
      newZoom = 1;
    }
    
    // Update zoom state
    setZoom(newZoom);
    zoomRef.current = newZoom;

    // Calculate new scroll position to keep cursor over the same content
    const newScrollLeft = preZoomX * newZoom - mouseX;
    const newScrollTop = preZoomY * newZoom - mouseY;

    // Apply the zoom and scroll changes
    requestAnimationFrame(() => {
      if (zoomableRef.current) {
        // Apply CSS transform for zooming
        zoomableRef.current.style.transform = `scale(${newZoom})`;
        zoomableRef.current.style.transformOrigin = "top left";
        
        // Update scroll position
        editor.scrollLeft = newScrollLeft;
        editor.scrollTop = newScrollTop;
      }
    });
  }, [setZoom, zoom, isCustomView]);

  // Set up and clean up event listeners
  useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener('wheel', handleWheel);
      ref.current.addEventListener('mousemove', handleMove);
    }

    return () => {
      if (ref.current) {
        ref.current.removeEventListener('wheel', handleWheel);
        ref.current.removeEventListener('mousemove', handleMove);
      }
    };
  }, [handleWheel, handleMove, ref]);

  return { zoom, zoomableRef, zoomRef };
};
