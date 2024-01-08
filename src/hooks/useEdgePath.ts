import React from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { Coordinate, ObjectNode, IOConnection } from '@/lib/nodes/types';

export const useEdgePatch = (node: ObjectNode, outletNumber: number, connection: IOConnection) => {

    const { sizeIndex, coordinates } = usePosition();

    let sourceCoordinate = coordinates[node.id];
    let destCoordinate = coordinates[(connection.destination as any).id];
    let sourceSize = sizeIndex[node.id];
    let destSize = sizeIndex[connection.destination.id];
    let source_w = sourceSize ? sourceSize.width : 30;
    let source_h = sourceSize ? sourceSize.height : 20;
    let dest_w = destSize ? destSize.width : 30;
    let dest_h = destSize ? destSize.height : 20;
    return React.useMemo(() => {
        if (sourceCoordinate && destCoordinate) {
            // we calculate the position of the inlet/outlets for this cable
            // by taking the width of the source/dest nodes and divide by numIOlets-1

            let sub = (connection.destination as ObjectNode).subpatch;
            let destInlet = connection.destinationInlet;
            let sourceCoordinate = coordinates[node.id];
            let destCoordinate = coordinates[(connection.destination as any).id];
            let inletNumber = connection.destination.inlets.indexOf(destInlet);
            let numInlets = connection.destination.inlets.length;
            let numOutlets = node.outlets.length;
            let width = (connection.source as ObjectNode).size ? (connection.source as ObjectNode).size!.width! : source_w
            let sourceBetween = ((width) - 10) / Math.max(1, numOutlets - 1);
            let dest_width = (connection.destination as ObjectNode).size ? (connection.destination as ObjectNode).size!.width : source_w
            let destBetween = ((dest_width) - 10) / Math.max(1, numInlets - 1)
            let offset = inletNumber * destBetween
            let destX = destCoordinate.x;

            destCoordinate = {
                ...destCoordinate,
                x: destX + offset
            };
            let height = (connection.source as ObjectNode).size ? (connection.source as ObjectNode).size!.height : source_h
            sourceCoordinate = {
                x: sourceCoordinate.x + outletNumber * sourceBetween,
                y: sourceCoordinate.y + height - 2
            };

            let isStraight = Math.abs(sourceCoordinate.x - destCoordinate.x) < 4;
            let [path, points] = generatePath(sourceCoordinate, destCoordinate);
            let d = connection.segmentation !== undefined && !isStraight ?
                generateSegmentedPaths(sourceCoordinate, destCoordinate, (connection.source as ObjectNode).position.y, connection.segmentation) :
                [path];

            if (points.length === 3) {
                points = [points[0], points[1], points[1], points[2]];
            }

            let point1 = cubicBezier(.1, points[0], points[1], points[2], points[3]);
            let point2 = cubicBezier(.9, points[0], points[1], points[2], points[3]);

            let destinationCircle = point2;
            let sourceCircle = point1;
            sourceCircle.y = sourceCoordinate.y + 10;
            if (connection.segmentation) {
                sourceCircle.x = sourceCoordinate.x + 2;
                destinationCircle.x = destCoordinate.x + 4;
            }

            return { d, destinationCircle, sourceCircle, destCoordinate, sourceCoordinate };
        }
        return { d: [] };
    }, [sourceCoordinate, destCoordinate, source_w, source_h, dest_w, dest_h, connection.segmentation]);

};

function cubicBezier(t: number, p0: Coordinate, p1: Coordinate, p2: Coordinate, p3: Coordinate): Coordinate {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    let point: Coordinate = { x: 0, y: 0 };
    point.x = uuu * p0.x; // first term
    point.y = uuu * p0.y; // first term
    point.x += 3 * uu * t * p1.x; // second term
    point.y += 3 * uu * t * p1.y; // second term
    point.x += 3 * u * tt * p2.x; // third term
    point.y += 3 * u * tt * p2.y; // third term
    point.x += ttt * p3.x; // fourth term
    point.y += ttt * p3.y; // fourth term

    return point;
}


export const generatePath = (source: Coordinate, dest: Coordinate): [string, Coordinate[]] => {

    let x1 = source.x;
    let y1 = source.y;
    let x2 = dest.x;
    let y2 = dest.y;

    if (Math.abs(x1 - x2) < 2) {
        x1 += 4;
        x2 += 4;
        return [`M ${x1},${y1} L ${x2},${y2}`, [{ x: x1, y: y1 }, { x: x1, y: y1 }, { x: x2, y: y2 }, { x: x2, y: y2 }]];
    }
    let points = getZObjectPath(x1 + 4, y1 + 3, x2 + 4, y2, false);
    let _pts = [];
    for (let i = 0; i < points.length - 1; i += 2) {
        _pts.push({ x: points[i], y: points[i + 1] });
    }

    const fl = (x: number) => Math.floor(x);
    let d = "M " + fl(points[0]) + ' ' + fl(points[1]);
    let pts = "";
    for (let i = 2; i < points.length - 1; i += 2) {
        pts += (fl(points[i]) + ' ' + fl(points[i + 1])) + ' ';
    }
    let command = "C"; //segmentation ? "Q" : "C";
    let u = d + " " + command + " " + pts;
    return [u, _pts];

    //return [`M ${x1},${y1} L ${x2},${y2}`, points];
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


const pointsToPath = (points: number[]): string => {
    const fl = (x: number) => Math.floor(x);
    let d = "M " + fl(points[0]) + ' ' + fl(points[1]);
    let pts = "";
    for (let i = 2; i < points.length - 1; i += 2) {
        pts += (fl(points[i]) + ' ' + fl(points[i + 1])) + ' ';
    }
    let command = "C"; //segmentation ? "Q" : "C";
    let u = d + " " + command + " " + pts;
    return u;
};


const generateSegmentedPaths = (source: Coordinate, dest: Coordinate, fromY: number, segmentY: number): string[] => {
    let x1 = source.x + 5;
    let y1 = source.y;
    let x2 = dest.x + 5;
    let y2 = dest.y;
    // let fromY = source.y;
    let isHorizontal = false;
    let diff = fromY - y1
    segmentY -= diff;
    let isLoop = y2 < y1;

    let offset = 5;
    let isSmol = false;
    /*
    if (Math.abs(x1 - x2) < 20) {
        offset = 0;
        isSmol = true;

    }
    */

    let cx1 = x1 + (x1 < x2 ? offset : -offset); //.9*x1 + .1*x2;
    let cx2 = x2 + (x1 > x2 ? offset : -offset); //.1*x1 + .9*x2;

    const width = 15;
    let _x2 = isHorizontal ? x2 - width : x2;
    let offsetX1 = x1 < x2 ? 10 : -10;
    let x_diff = Math.abs(x1 - x2);
    let _ratio = Math.min(1, (x_diff / 80))
    offsetX1 *= _ratio;
    let path1 = [
        x1, y1,
        x1, segmentY,
        x1 - 0.1 * offsetX1, segmentY,
        cx1 + offsetX1, segmentY
    ];

    if (isSmol) {
        path1 = [
            x1, y1,
            x1, segmentY,
            x1, segmentY,
            cx1, segmentY
        ];
    }


    if (isLoop) {
        let offset = 10;
        let _x2a = _x2 - offset;
        let cx2a = cx2 - offset * .5;;
        let y2a = y2 - offset;
        let path2 = [
            cx1, segmentY,
            .5 * x1 + .5 * _x2a, segmentY,
            .5 * x1 + .5 * _x2a, segmentY,
            cx2a, segmentY,
        ];
        let path3 = [
            cx2a, segmentY,
            _x2a + 0, segmentY,
            _x2a + 0, segmentY,
            _x2a + 0, y2a,
        ];
        let path4 = [
            _x2a, y2a,
            _x2a, y2a - offset * .50, // - offset*.5,
            _x2a + offset * .5, y2a - offset * .5,
            _x2a + offset * .5, y2a - offset * .5,
        ];

        let x3 = _x2a + offset * 0.5;
        let y3 = y2a - offset * 0.5;
        let path5 = [
            x3, y3,
            x3 + 0.6 * offset, y3 + 0.100 * offset,
            x3 + 0.5 * offset + 0.1000 * offset, y3,
            _x2, y2,
        ];

        let paths = [path1, path2, path3, path4, path5];
        return paths.map(pointsToPath);
    }
    let offsetX = x1 < x2 ? Math.max(-2, (x1 - x2)) : Math.min(2, x1 - x2);
    offsetX *= 4.8;
    let offset_middle = x1 < x2 ? 5 : -5;
    let _off = x1 < x2 ? offset + 5 : -(offset + 5);
    let path2 = [
        cx1 + offsetX1, segmentY,
        cx1 + offsetX1, segmentY,
        cx2 - offsetX1, segmentY,
        cx2 - offsetX1, segmentY,
    ];

    let path3 = [
        cx2 - offsetX1, segmentY,
        _x2, segmentY,
        _x2, segmentY,
        _x2, y2,
    ];
    if (isSmol) {
        path3 = [
            _x2 + offsetX, segmentY,
            _x2, segmentY,
            _x2, segmentY,
            _x2, y2,
        ];
    }
    let paths = [path1, path2, path3];
    return paths.map(pointsToPath);
};
