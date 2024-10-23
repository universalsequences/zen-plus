import React, { useEffect } from "react";
import { usePatch } from "@/contexts/PatchContext";
import { useLocked } from "@/contexts/LockedContext";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";

import { LockClosedIcon, LockOpen2Icon } from "@radix-ui/react-icons";

const LockButton = () => {
  const { presentationMode } = usePosition();
  const { patch } = usePatch();
  const { setLockedMode, lockedMode } = useLocked();

  return (
    <div
      onClick={() => {
        patch.lockedMode = !lockedMode;
        setLockedMode(!lockedMode);
      }}
      className="cursor-pointer mr-3"
    >
      {lockedMode ? <LockClosedIcon className="w-4 h-4" /> : <LockOpen2Icon className="w-4 h-4" />}
    </div>
  );
};

export default LockButton;
