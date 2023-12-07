import React from 'react';
import { useSelection } from '@/contexts/SelectionContext';

import { LockClosedIcon, LockOpen2Icon } from '@radix-ui/react-icons'

const LockButton = () => {
    const { setLockedMode, lockedMode } = useSelection();

    return <div
        onClick={() => setLockedMode(!lockedMode)}
        className="absolute bottom-3 left-3 cursor-pointer">
        {lockedMode ? <LockClosedIcon className="w-8 h-8" /> :
            <LockOpen2Icon className="w-8 h-8" />}
    </div>
};

export default LockButton;
