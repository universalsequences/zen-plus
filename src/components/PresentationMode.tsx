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
            setLockedMode(true);
            setPreparePresentationMode(true);
            setTimeout(() => {
                setPresentationMode(!presentationMode)
                patch.presentationMode = !presentationMode;
                if (patch.presentationMode) {
                    setLockedMode(true);
                }
                setTimeout(() => {
                    setPreparePresentationMode(false);
                }, 1000);
            }, 50);
        }}
        className={(presentationMode ? "bg-white" : "") + " cursor-pointer p-0.5 rounded-full h-5 w-5"}>
        <DesktopIcon className={(presentationMode ? "invert" : "") + " w-4 h-4"} />
    </div>
}

export default PresentationMode;
