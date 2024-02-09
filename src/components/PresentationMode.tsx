import React, { useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { useSelection } from '@/contexts/SelectionContext';
import { usePatch } from '@/contexts/PatchContext';
import { DesktopIcon } from '@radix-ui/react-icons'

const PresentationMode = () => {
    const { setPreparePresentationMode, setPresentationMode, presentationMode } = usePosition();
    const { patch } = usePatch();
    const { setLockedMode, lockedMode } = useSelection();

    return <div
        onClick={() => {
            setPreparePresentationMode(true);
            setTimeout(() => {
                setPresentationMode(!presentationMode)
                patch.presentationMode = !presentationMode;
                setTimeout(() => {
                    setPreparePresentationMode(false);
                }, 1000);
            }, 50);
        }}
        className={(presentationMode ? "bg-white" : "") + " cursor-pointer p-0.5 rounded-full h-7 w-7"}>
        <DesktopIcon className={(presentationMode ? "invert" : "") + " w-6 h-6"} />
    </div>
}

export default PresentationMode;
