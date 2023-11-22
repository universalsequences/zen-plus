"use client"
import PatchWrapper from './PatchWrapper';
import PatchComponent from '@/components/PatchComponent';
import { PatchesProvider } from '@/contexts/PatchesContext';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';
import { PatchImpl } from '@/lib/nodes/Patch';


export default function PatchesComponent() {
    let { patches } = usePatches();
    return <>
        <div className={"m-4 flex-1 grid patches h-full flex-1 " + ("patches-" + patches.length)}>
            {patches.map(
                (patch, i) => <PatchWrapper index={i} key={i} patch={patch} />)}
        </div>
    </>

}
