import { ObjectNode, Size } from '@/lib/nodes/types';

export const getUpdatedSize = (objectNode: ObjectNode, size: Size | null): Size => {
    if (objectNode.position) {
        let p = objectNode.position;
        if (!size) {
            let x = {
                width: p.x + 800,
                height: p.y + 800
            };
        } else {
            let { width, height } = size;
            if (p.x + 100 > width) {
                width = p.x + 300;
            }
            if (p.y + 100 > height) {
                height = p.y + 300;
            }
            return { width, height };
        }
    }
    return { width: 500, height: 500 };
};
