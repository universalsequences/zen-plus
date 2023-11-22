"use client"
import { PositionProvider } from '@/contexts/PositionContext';
import PatchComponent from '@/components/PatchComponent';
import { PatchProvider } from '@/contexts/PatchContext';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';
import { PatchImpl } from '@/lib/nodes/Patch';


const PatchWrapper: React.FC<{ patch: Patch, index: number }> = ({ patch, index }) => {
    return <PatchProvider patch={patch}>
        <PositionProvider>
            <PatchComponent index={index} />
        </PositionProvider>
    </PatchProvider>;

}
export default PatchWrapper;
