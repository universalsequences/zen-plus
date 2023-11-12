import React from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { Coordinate, ObjectNode, IOConnection } from '@/lib/nodes/types';

export const useEdgePatch = (node: ObjectNode, outletNumber: number, connection: IOConnection) => {

    const { coordinates } = usePosition();

    let sourceCoordinate = coordinates[node.id];
    let destCoordinate = coordinates[(connection.destination as any).id];
    const d = React.useMemo(() => {
        if (sourceCoordinate && destCoordinate) {
            let destInlet = connection.destinationInlet;
            let sourceCoordinate = coordinates[node.id];
            let inletNumber = connection.destination.inlets.indexOf(destInlet);

            destCoordinate = {
                ...destCoordinate,
                x: destCoordinate.x + inletNumber * 8
            };
            sourceCoordinate = {
                x: sourceCoordinate.x + outletNumber * 10,
                y: sourceCoordinate.y + 23
            };
            return generatePath(sourceCoordinate, destCoordinate);
        }
        return "";
    }, [sourceCoordinate, destCoordinate]);

    return d;
};

const generatePath = (source: Coordinate, dest: Coordinate) => {

    let x1 = source.x;
    let y1 = source.y;
    let x2 = dest.x;
    let y2 = dest.y;

    let points = getZObjectPath(x1 + 5, y1 + 6, x2 + 5, y2, false);

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

