"use client";
import AssistantSidebar from "./AssistantSidebar";
import PatchWindow from "./PatchWindow";
import { Landing } from "./landing/Landing";
import { useAuth } from "@/contexts/AuthContext";
import { useSwitchNetwork } from "wagmi";
import { zora } from "wagmi/chains";
import SearchWindow from "./search/SearchWindow";
import { useSettings } from "@/contexts/SettingsContext";
import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import { usePatches } from "@/contexts/PatchesContext";
import { useSelection } from "@/contexts/SelectionContext";
import PatchTile from "./PatchTile";
import { useTilesContext } from "@/contexts/TilesContext";

const PatchesComponent: React.FC<{
  fileToOpen: any | null;
  setFileToOpen: (x: any | null) => void;
}> = ({ fileToOpen, setFileToOpen }) => {
  let { rootTile, patchWindows, selectedPatch, patches } = usePatches();
  let { gridTemplate } = useTilesContext();

  let {
    lastResizingTime,
    setSelection,
    setSelectedNodes,
    setSelectedConnection,
    selection,
  } = useSelection();
  let [showSearch, setShowSearch] = useState(false);

  const { googleSignIn, user } = useAuth();
  const { lightMode } = useSettings();

  useEffect(() => {
    window.addEventListener("beforeunload", (e) => {
      // Cancel the event as stated by the standard.
      e.preventDefault();
      // Chrome requires returnValue to be set.
      //e.returnValue = 'Please save before leaving? Are you sure?';
    });
  }, []);

  useEffect(() => {
    window.addEventListener("keyup", onKey);
    return () => window.removeEventListener("keyup", onKey);
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target &&
        ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
          (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
      ) {
        return;
      }

      if (e.key === "/") {
        setShowSearch(true);
      }
    },
    [setShowSearch],
  );

  const onClick = useCallback(
    (e: any) => {
      if (e.button === 2) {
        return;
      }
      let now = new Date().getTime();
      if (now - lastResizingTime.current < 200) {
        return;
      }
      if (selection == null || selection.x1 === selection.x2) {
        setSelectedNodes([]);
        setSelectedConnection(null);
      }
      setSelection(null);
    },
    [setSelection, selection],
  );

  useEffect(() => {
    if (lightMode) {
      document.body.className = "light-mode";
    } else {
      document.body.className = "dark-mode";
    }
  }, [lightMode]);

  return React.useMemo(() => {
    return (
      <>
        <div
          onClick={onClick}
          className={
            "flex w-full h-full min-h-screen " + (lightMode ? "light-mode" : "")
          }
        >
          {patchWindows.map((patch) => (
            <PatchWindow key={patch.id} patch={patch} />
          ))}
          <div className="flex flex-col w-full mt-5">
            <div
              //style={patches.length > 1 ? { gridTemplateColumns: gridTemplate } : {}}
              className={
                "m-1 mt-4 flex-1 patches h-full flex-1 " +
                ("patches-" + patches.length)
              }
            >
              {rootTile ? (
                <PatchTile
                  fileToOpen={fileToOpen}
                  setFileToOpen={setFileToOpen}
                  gridTemplate={gridTemplate}
                  tile={rootTile}
                />
              ) : (
                ""
              )}
            </div>
          </div>
          <Sidebar />
          {showSearch && <SearchWindow hide={() => setShowSearch(false)} />}
        </div>
      </>
    );
  }, [
    patchWindows,
    patches,
    onClick,
    user,
    rootTile,
    selectedPatch,
    selection,
    setSelection,
    gridTemplate,
    showSearch,
    setShowSearch,
    lightMode,
    fileToOpen,
    setFileToOpen,
  ]);
};

export default PatchesComponent;
