
import { API } from '@/lib/nodes/context';
import { doc } from './doc';
import { ObjectNode, Message, Lazy } from '../../types';

export type SVGType = "path" | "line" | "circle";

export interface SVGObject {
    type: SVGType;
    stroke?: string;
    strokeWidth?: number;
    d?: string;
    radius?: number;
    fill?: string;
    coordinate: number[]
}

doc(
    'circle',
    {
        description: "generates a path",
        numberOfInlets: 3,
        numberOfOutlets: 1,
        inletNames: ["x,y", "radius", "fill"],
    });
const circle = (node: ObjectNode, radius: Lazy, fill: Lazy) => {
    return (message: Message) => {
        let obj: SVGObject = { type: "circle", fill: fill() as string, radius: radius() as number, coordinate: message as number[] };
        return [obj];
    }
}

doc(
    'path',
    {
        description: "generates a path",
        numberOfInlets: 5,
        numberOfOutlets: 1,
        defaultValue: [],
        inletNames: ["M", "L", "C", "stroke", "stroke-width"]
    });
const path = (node: ObjectNode, l: Lazy, c: Lazy, stroke: Lazy, strokeWidth: Lazy) => {
    return (M: Message) => {
        let d = "";

        if (typeof M === "string") {
            M = M.split(",");
        }
        if (Array.isArray(M) && M.length > 0) {
            d += " M ";
            for (let _m of M) {
                d += " " + _m + " ";
            }
        }

        let L = l();
        if (typeof L === "string") {
            L = L.split(",");
        }
        if (Array.isArray(L) && L.length > 0) {
            d += " L ";
            for (let _l of L) {
                d += " " + _l + " ";
            }
        }

        let C = c();

        if (typeof C === "string") {
            C = C.split(",");
        }
        if (Array.isArray(C) && C.length > 0) {
            d += " C ";
            for (let _c of C) {
                d += " " + _c + " ";
            }
        }

        let p: SVGObject = {coordinate: [0,0], type: "path", stroke: stroke() as string, d, strokeWidth: strokeWidth() as number || 2};
        return [p];
    };
};

doc(
    'canvas',
    {
        description: "canvas for svg",
        numberOfInlets: 1,
        numberOfOutlets: 1,
    });
const canvas = (node: ObjectNode) => {
    return (message: Message) => {
        if (Array.isArray(message)) {
            let i = 0;
            for (let m of message) {
                if (!node.outlets[i]) {
                    console.log("creating outlets...", "move", i);
                    node.newOutlet("move " + i);
                }
                i++;
            }
        }
        if (node.patch.onNewMessage) {
            node.patch.onNewMessage(node.id, message);
        }
        return [];
    };
};

export const api: API = {
    canvas: canvas,
    path,
    circle,
};

