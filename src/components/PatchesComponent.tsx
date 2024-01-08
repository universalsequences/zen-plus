"use client"
import Toolbar from './Toolbar';
import SearchWindow from './SearchWindow';
import { Backfill } from './Backfill';

import { useSettings } from '@/contexts/SettingsContext';
import React, { useEffect, useState, useCallback } from 'react';
import PatchWrapper from './PatchWrapper';
import Sidebar from './Sidebar';
import ZenCodeSidebar from './ZenCodeSidebar';
import PatchComponent from '@/components/PatchComponent';
import { PatchesProvider } from '@/contexts/PatchesContext';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';
import { useSelection } from '@/contexts/SelectionContext';
import { PatchImpl } from '@/lib/nodes/Patch';
import PatchTile from './PatchTile';


export default function PatchesComponent() {
    let { rootTile, selectedPatch, patches, gridTemplate } = usePatches();

    let { lastResizingTime, setSelection, setSelectedNodes, setSelectedConnection, selection } = useSelection();
    let [showSearch, setShowSearch] = useState(false);

    const { lightMode } = useSettings();

    useEffect(() => {
        window.addEventListener("beforeunload", function(e) {
            // Cancel the event as stated by the standard.
            e.preventDefault();
            // Chrome requires returnValue to be set.
            e.returnValue = 'Please save before leaving? Are you sure?';
        });

    }, []);

    useEffect(() => {
        window.addEventListener("keyup", onKey);
        return () => window.removeEventListener("keyup", onKey);
    }, []);

    const onKey = useCallback((e: KeyboardEvent) => {
        if (e.target && ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
            (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
        ) {
            return;
        }

        if (e.key === "/") {
            setShowSearch(true);
        }
    }, [setShowSearch]);

    /*
    let nodes = patches[0].getAllNodes();
    let ids = nodes.map(x => x.id);
    let setids = new Set(ids);
        console.log("ids=%s unique=%s", ids.length, setids.size);
        */

    const onClick = useCallback((e: any) => {
        if (e.button == 2) {
            return;
        }
        let now = new Date().getTime();
        if (now - lastResizingTime.current < 200) {
            return;
        }
        if (selection == null || selection.x1 === selection.x2) {
            setSelectedNodes([]);
            setSelectedConnection(null);
        }
        setSelection(null);
    }, [setSelection, selection]);

    return React.useMemo(() => {
        return <>
            <div
                onClick={onClick}
                className={"flex w-full h-full min-h-screen " + (lightMode ? "light-mode" : "")}>
                <div className="flex flex-col w-full mt-5">
                    <div
                        //style={patches.length > 1 ? { gridTemplateColumns: gridTemplate } : {}}
                        className={"m-1 mt-4 flex-1 patches h-full flex-1 " + ("patches-" + patches.length)}>
                        {rootTile ? <PatchTile tile={rootTile} /> : ""}
                    </div>
                </div>
                <Sidebar />
                <ZenCodeSidebar />
                {showSearch && <SearchWindow hide={() => setShowSearch(false)} />}
            </div >
            {/*<Backfill />*/}

        </>
    }, [patches, rootTile, selectedPatch, selection, setSelection, gridTemplate, showSearch, setShowSearch, lightMode]);

}
