import { IOConnection, ObjectNode } from '@/lib/nodes/types';
import { SizeIndex } from '@/contexts/PositionContext';


export const getSegmentation = (cable: IOConnection, sizeIndex: SizeIndex) => {
    let { source, destination } = cable;
    let fromHeight = sizeIndex[source.id].height;
    let sourceCoord = (source as ObjectNode).position;
    let destCoord = (destination as ObjectNode).position;
    let sourceY = sourceCoord.y + fromHeight;
    let yDiff = destCoord.y - (sourceY - 20);
    let y = yDiff < 120 ? (0.5 * (sourceY) + 0.5 * destCoord.y) - 25 :
        sourceY + 45;
    return y;
}


