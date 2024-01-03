import React, { useEffect } from 'react';
import { useSelection } from '@/contexts/SelectionContext';
import { usePosition } from '@/contexts/PositionContext';

import { LockClosedIcon, LockOpen2Icon } from '@radix-ui/react-icons'

const LockButton = () => {
    const { setLockedMode, lockedMode } = useSelection();
    const { presentationMode } = usePosition();

    return <div
        onClick={() => {
            setLockedMode(!lockedMode);
        }}
        className="cursor-pointer mr-3">
        {lockedMode ? <LockClosedIcon className="w-5 h-5" /> :
            <LockOpen2Icon className="w-5 h-5" />}
    </div>
};

export default LockButton;
