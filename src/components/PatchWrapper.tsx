"use client"
import PatchComponent from '@/components/PatchComponent';
import { PositionProvider } from '@/contexts/PositionContext';
import { PatchProvider } from '@/contexts/PatchContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { Patch, IOlet, MessageNode, IOConnection, ObjectNode, Coordinate } from '@/lib/nodes/types';
import { usePatches } from '@/contexts/PatchesContext';
import { PatchImpl } from '@/lib/nodes/Patch';


const PatchWrapper: React.FC<{ setFileToOpen: (x: any | null) => void, fileToOpen: any | null, maxWidth: number, maxHeight: number, patch: Patch, index: number }> = ({ patch, index, maxWidth, maxHeight, fileToOpen, setFileToOpen }) => {
    return <PatchProvider patch={patch}>
        <PositionProvider patch={patch}>
            <PatchComponent maxWidth={maxWidth} maxHeight={maxHeight} index={index} setFileToOpen={setFileToOpen} fileToOpen={fileToOpen} />
        </PositionProvider>
    </PatchProvider>;

}
export default PatchWrapper;
