"use client"
import PatchComponent from '@/components/PatchComponent';
import { PositionProvider } from '@/contexts/PositionContext';
import { PatchProvider } from '@/contexts/PatchContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';
import { PatchImpl } from '@/lib/nodes/Patch';


const PatchWrapper: React.FC<{ patch: Patch, index: number }> = ({ patch, index }) => {
    return <PatchProvider patch={patch}>
        <PositionProvider patch={patch}>
            <PatchComponent index={index} />
        </PositionProvider>
    </PatchProvider>;

}
export default PatchWrapper;
