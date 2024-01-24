import React, { useEffect, useCallback, useState } from 'react';
import { MagicWandIcon } from '@radix-ui/react-icons'
import Assistant from './Assistant';

const Sidebar = () => {

    let [opened, setOpened] = useState(false);
    return <div
        style={{ zIndex: 10000000000 }}
        onMouseDown={(e: any) => e.stopPropagation()}
        onClick={(e: any) => e.stopPropagation()}
        className={
            "bg-toolbar fixed bottom-20 right-0 flex sidebar " + (opened ? "opened-sidebar" : "")}
    >
        <div
            onClick={() => {
                setOpened(!opened);
            }}
            style={{
                bottom: "0px",
                left: "-40px",
            }}

            className="cursor-pointer absolute p-2 w-10 h-10 bg-toolbar sidebar-btn">
            <MagicWandIcon
                className="w-6 h-6 " />
        </div>
        {opened ? <Assistant /> : ""}

    </div >
}
export default Sidebar;
