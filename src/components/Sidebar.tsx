import React, { useEffect, useCallback, useState } from 'react';
import Attributes from './Attributes';
import { ObjectNode } from '@/lib/nodes/types';
import Attribute from './Attribute';
import { CubeIcon } from '@radix-ui/react-icons'
import { useSelection } from '@/contexts/SelectionContext';

const Sidebar = () => {
    const { selectedNodes } = useSelection();

    const inner = React.useMemo(() => {
        let node = selectedNodes[0];
        if (node) {
            let attributes = node.attributes;
            let attributeNames = Object.keys(attributes);
            return (
                <div className="w-full h-full text-xs">
                    <Attributes node={node} />
                </div>
            );
        } else {
            return <></>;
        }
    }, [selectedNodes]);

    let [opened, setOpened] = useState(false);
    let name = selectedNodes[0] ? ((selectedNodes[0] as ObjectNode).name || "number") : "";

    useEffect(() => {
        if (selectedNodes.length === 0) {
            setOpened(false);
        }
    }, [selectedNodes, setOpened]);

    useEffect(() => {
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [setOpened, selectedNodes, opened]);

    const onKeyDown = useCallback((e: any) => {
        if (e.key === "Tab" && selectedNodes.length > 0) {
            e.preventDefault();
            setOpened(!opened);
        }
    }, [selectedNodes, setOpened, opened]);

    return <div
        style={{ zIndex: 100000000000000000 }}
        onMouseDown={(e: any) => e.stopPropagation()}
        onClick={(e: any) => e.stopPropagation()}
        className={
            "bg-black fixed top-10 right-0 flex sidebar " + (opened ? "opened-sidebar" : "")}
    >
        <div
            onClick={() => {
                if (selectedNodes.length > 0) {
                    setOpened(!opened);
                }
            }}
            style={{
                top: "-1px",
                left: "-40px",
                borderTop: "1px solid white", borderLeft: "1px solid white", borderBottom: "1px solid white"
            }}

            className="cursor-pointer absolute p-2 w-10 h-10 bg-black">
            <CubeIcon
                style={{
                    opacity: selectedNodes.length > 0 ? 1 : 0.5
                }}
                className="w-6 h-6 " />
        </div>
        {opened ? inner : ""}
    </div >
}
export default Sidebar;
