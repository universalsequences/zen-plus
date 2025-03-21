import React, { useEffect, useCallback, useState } from "react";
import { usePosition } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import { usePatch } from "@/contexts/PatchContext";
import { DesktopIcon } from "@radix-ui/react-icons";

const PresentationMode = () => {
  const { setPreparePresentationMode, setPresentationMode, presentationMode } = usePosition();
  const { patch } = usePatch();

  return (
    <div
      onClick={() => {
        setPreparePresentationMode(true);
        setTimeout(() => {
          setPresentationMode(!presentationMode);
          patch.presentationMode = !presentationMode;
          setTimeout(() => {
            setPreparePresentationMode(false);
          }, 1000);
        }, 50);
      }}
      className={
        (presentationMode ? "bg-white" : "") +
        " cursor-pointer p-0.5 rounded-full h-6 w-6 flex my-auto"
      }
    >
      <DesktopIcon
        className={(presentationMode ? "invert w-5 h-5" : "w-5 h-5") + " m-auto transition-all"}
      />
    </div>
  );
};

export default PresentationMode;
