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
        {lockedMode ? <LockClosedIcon className="w-7 h-7" /> :
            <LockOpen2Icon className="w-7 h-7" />}
    </div>
};

export default LockButton;
