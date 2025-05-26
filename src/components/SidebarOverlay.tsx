import { useCallback, useEffect, useState, useRef } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Cross2Icon, TriangleLeftIcon, TriangleRightIcon } from "@radix-ui/react-icons";
import { NodePatchWrapper } from "./NodePatchWrapper";

export const SidebarOverlay = () => {
  const { currentSidebarObject, isMinimized, setIsMinimized, setCurrentSidebarObject } =
    useSidebar();
  const [isVisible, setIsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Show overlay when there's a current sidebar object
  useEffect(() => {
    setIsVisible(!!currentSidebarObject && !isMinimized);
  }, [currentSidebarObject, isMinimized]);

  // Handle click outside to minimize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        if (currentSidebarObject && !isMinimized) {
          setIsMinimized(true);
        }
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVisible, currentSidebarObject, isMinimized, setIsMinimized]);

  const handleClose = useCallback(() => {
    setCurrentSidebarObject(null);
    setIsMinimized(false);
  }, [setCurrentSidebarObject, setIsMinimized]);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized, setIsMinimized]);

  // Don't render if no object is selected
  if (!currentSidebarObject) return null;

  return (
    <>
      {/* Minimized tab */}
      {isMinimized && (
        <div
          className="select-none fixed right-0 top-1/2 transform -translate-y-1/2 z-[9999999999] bg-zinc-800 border-l border-zinc-600 cursor-pointer hover:bg-zinc-700 transition-colors"
          onClick={handleToggleMinimize}
        >
          <div className="p-2 flex items-center gap-2">
            <TriangleLeftIcon className="w-4 h-4 text-zinc-300" />
            <span className="text-sm text-zinc-300" style={{ writingMode: "vertical-rl" }}>
              {currentSidebarObject.text || "Sidebar"}
            </span>
          </div>
        </div>
      )}

      {/* Full sidebar overlay */}
      {isVisible && (
        <div
          ref={overlayRef}
          className="fixed select-none right-0 top-1/2 transform -translate-y-1/2 bg-zinc-900/95 border border-zinc-700 rounded-l-lg shadow-2xl z-[9999999999] backdrop-blur-sm p-3"
        >
          <NodePatchWrapper objectNode={currentSidebarObject} />
        </div>
      )}
    </>
  );
};
