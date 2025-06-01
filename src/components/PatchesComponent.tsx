"use client";
import React, { useEffect, useState, useCallback } from "react";
import { PatchWindows } from "./PatchWindows";
import SearchWindow from "./search/SearchWindow";
import Sidebar from "./Sidebar";
import PatchTile from "./PatchTile";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { usePatches } from "@/contexts/PatchesContext";
import { useSelection } from "@/contexts/SelectionContext";
import { useTilesContext } from "@/contexts/TilesContext";
import { useWindows } from "@/contexts/WindowsContext";
import { SidebarOverlay } from "./SidebarOverlay";
import { AssistantSidebar } from "./AssistantSidebar";

/**
 * PatchesComponent is the main container for all patches in the patcher environment
 *
 * It manages the layout of patches, sidebars, windows, and handles global interactions
 * such as keyboard shortcuts and theme switching.
 */
const PatchesComponent: React.FC<{
  fileToOpen: any | null;
  setFileToOpen: (x: any | null) => void;
}> = ({ fileToOpen, setFileToOpen }) => {
  // Application state hooks
  const { patchWindows } = useWindows();
  const { rootTile, patches } = usePatches();
  const { gridTemplate } = useTilesContext();
  const { lastResizingTime, setSelection, setSelectedNodes, setSelectedConnection, selection } =
    useSelection();
  const { lightMode } = useSettings();

  // UI state
  const [showSearch, setShowSearch] = useState(false);

  // Warn user before page unload to prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      // e.returnValue = 'Please save before leaving? Are you sure?';
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Set up keyboard shortcut handling
  useEffect(() => {
    window.addEventListener("keyup", onKey);
    return () => window.removeEventListener("keyup", onKey);
  }, []);

  // Handle keyboard shortcuts
  const onKey = useCallback((e: KeyboardEvent) => {
    // Skip if focus is in an input element
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName.toLowerCase() === "input" || target.tagName.toLowerCase() === "textarea")
    ) {
      return;
    }

    // Open search with '/' key
    if (e.key === "/") {
      setShowSearch(true);
    }
  }, []);

  // Handle global background clicks
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // Ignore right clicks
      if (e.button === 2) {
        return;
      }

      // Prevent accidental clicks during resizing
      const now = new Date().getTime();
      if (now - lastResizingTime.current < 200) {
        return;
      }

      // Clear selection when clicking on empty space
      if (selection == null || selection.x1 === selection.x2) {
        setSelectedNodes([]);
        setSelectedConnection(null);
      }
      setSelection(null);
    },
    [setSelection, selection, setSelectedNodes, setSelectedConnection, lastResizingTime],
  );

  // Apply theme to document body
  useEffect(() => {
    document.body.className = lightMode ? "light-mode" : "dark-mode";
  }, [lightMode]);

  // Memoize the component to prevent unnecessary re-renders
  return React.useMemo(
    () => (
      <div
        onClick={onClick}
        className={`flex w-full h-full min-h-screen ${lightMode ? "light-mode" : ""}`}
      >
        <div className="flex flex-col w-full">
          {/* Patches container */}
          <div className={`flex-1 flex flex-col patches patches-${patches.length}`}>
            {rootTile && (
              <PatchTile
                fileToOpen={fileToOpen}
                setFileToOpen={setFileToOpen}
                gridTemplate={gridTemplate}
                tile={rootTile}
              />
            )}
          </div>

          {/* Floating windows */}
          <PatchWindows />
        </div>

        <AssistantSidebar />

        {/* Sidebar with tools and controls */}
        <Sidebar />

        {/* Search overlay */}
        {showSearch && <SearchWindow hide={() => setShowSearch(false)} />}

        {/* Sidebar overlay */}
        <SidebarOverlay />
      </div>
    ),
    [
      patchWindows,
      patches,
      onClick,
      rootTile,
      selection,
      gridTemplate,
      showSearch,
      lightMode,
      fileToOpen,
      setFileToOpen,
    ],
  );
};

export default PatchesComponent;
