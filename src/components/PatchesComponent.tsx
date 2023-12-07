"use client"

import React, { useCallback } from 'react';
import PatchWrapper from './PatchWrapper';
import Sidebar from './Sidebar';
import PatchComponent from '@/components/PatchComponent';
import { PatchesProvider } from '@/contexts/PatchesContext';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';
import { useSelection } from '@/contexts/SelectionContext';
import { PatchImpl } from '@/lib/nodes/Patch';


export default function PatchesComponent() {
    let { patches, gridTemplate } = usePatches();
    let { lastResizingTime, setSelection, setSelectedNodes, setSelectedConnection, selection } = useSelection();

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

    return <>
        <div
            onClick={onClick}
            className="flex w-full h-full min-h-screen">
            <div className="flex flex-col w-full">
                <div
                    style={patches.length === 2 ? { gridTemplateColumns: gridTemplate } : {}}
                    className={"m-4 flex-1 grid patches h-full flex-1 " + ("patches-" + patches.length)}>
                    {patches.map(
                        (patch, i) => <PatchWrapper index={i} key={i} patch={patch} />)}
                </div>
            </div>
            <Sidebar />
        </div >
    </>

}
