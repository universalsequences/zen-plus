import React, { useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { usePatch } from '@/contexts/PatchContext';
import { DesktopIcon } from '@radix-ui/react-icons'

const PresentationMode = () => {
    const { setPreparePresentationMode, setPresentationMode, presentationMode } = usePosition();
    const { patch } = usePatch();

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
        className={(presentationMode ? "bg-white" : "") + " absolute bottom-16 left-3 cursor-pointer p-1 rounded-full"}>
        <DesktopIcon className={(presentationMode ? "invert" : "") + " w-7 h-7"} />
    </div>
}

export default PresentationMode;
