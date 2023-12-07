import React from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { Coordinate, ObjectNode, IOConnection } from '@/lib/nodes/types';

export const useEdgePatch = (node: ObjectNode, outletNumber: number, connection: IOConnection) => {

    const { sizeIndex, coordinates } = usePosition();

    let sourceCoordinate = coordinates[node.id];
    let destCoordinate = coordinates[(connection.destination as any).id];
    let sourceSize = sizeIndex[node.id];
    let destSize = sizeIndex[connection.destination.id];
    return React.useMemo(() => {
        if (sourceCoordinate && destCoordinate) {
            // we calculate the position of the inlet/outlets for this cable
            // by taking the width of the source/dest nodes and divide by numIOlets-1
            let destInlet = connection.destinationInlet;
            let sourceCoordinate = coordinates[node.id];
            let destCoordinate = coordinates[(connection.destination as any).id];
            let inletNumber = connection.destination.inlets.indexOf(destInlet);
            let numInlets = connection.destination.inlets.length;
            let numOutlets = node.outlets.length;
            let sourceBetween = ((sourceSize ? sourceSize.width : 80) - 10) / Math.max(1, numOutlets - 1);
            let destBetween = ((destSize ? destSize.width : 80) - 10) / Math.max(1, numInlets - 1)
            let offset = inletNumber * destBetween
            let destX = destCoordinate.x;
            destCoordinate = {
                ...destCoordinate,
                x: destX + offset
            };
            let height = sourceSize ? sourceSize.height : 23;
            sourceCoordinate = {
                x: sourceCoordinate.x + outletNumber * sourceBetween,
                y: sourceCoordinate.y + height - 3
            };
            let d = generatePath(sourceCoordinate, destCoordinate);

            let destinationCircle = interpolate(
                { ...destCoordinate, x: destCoordinate.x + 5 }, sourceCoordinate, .1);
            let sourceCircle = interpolate(
                { ...sourceCoordinate, x: sourceCoordinate.x + 5 }, destCoordinate, .1);
            return { d, destinationCircle, sourceCircle, destCoordinate, sourceCoordinate };
        }
        return { d: "" };
    }, [sourceCoordinate, destCoordinate, sourceSize, destSize]);

};

export const generatePath = (source: Coordinate, dest: Coordinate) => {

    let x1 = source.x;
    let y1 = source.y;
    let x2 = dest.x;
    let y2 = dest.y;

    if (Math.abs(x1 - x2) < 2) {
        x1 += 4;
        x2 += 4;
        return `M ${x1},${y1} L ${x2},${y2}`;
    }
    let points = getZObjectPath(x1 + 4, y1 + 3, x2 + 4, y2, false);

    const fl = (x: number) => Math.floor(x);
    let d = "M " + fl(points[0]) + ' ' + fl(points[1]);
    let pts = "";
    for (let i = 2; i < points.length - 1; i += 2) {
        pts += (fl(points[i]) + ' ' + fl(points[i + 1])) + ' ';
    }
    let command = "C"; //segmentation ? "Q" : "C";
    let u = d + " " + command + " " + pts;
    return u;

    return `M ${x1},${y1} L ${x2},${y2}`;
};


export const getZObjectPath = (x1: number, y1: number, x2: number, y2: number, isHorizontal: boolean) => {
    let diff = Math.abs(y2 - y1);
    let y_a = Math.max(20, Math.min(40, diff));
    let y_b = Math.max(20, Math.min(40, diff));
    if (y2 < y1) {
        y_a = 40;
    }

    let diffX = Math.abs(x2 - x1);
    let x_a = Math.max(5, Math.min(20, diffX));
    let x_b = Math.max(5, Math.min(20, diffX));

    let x_sign = (x2 - x1) < 0 ? 1 : -1;

    if (isHorizontal) {
        return [
            x1, y1,
            x1, y1 + y_a,
            x2 - y_b, y2,
            x2, y2,
        ];
    }

    return [
        x1, y1,
        x1 + -x_sign * x_a, y1 + y_a,
        x2 + x_sign * x_b, y2 - y_b,
        x2, y2];
};

function interpolate(pointA: Coordinate, pointB: Coordinate, t: number): Coordinate {
    return {
        x: pointA.x + (pointB.x - pointA.x) * t,
        y: pointA.y + (pointB.y - pointA.y) * t
    };
}
