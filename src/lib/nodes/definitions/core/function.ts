import { doc } from './doc';
import { publish } from '@/lib/messaging/queue';
import { Message, ObjectNode } from '@/lib/nodes/types';

export interface Point {
    x: number,
    y: number
    c?: number
}

export class FunctionEditor {
    points: Point[];
    objectNode: ObjectNode;
    updates: number;
    value: Message;

    constructor(objectNode: ObjectNode) {
        this.objectNode = objectNode;
        this.points = [];
        this.updates = 0;
        this.value = 0;
    }

    getJSON() {
        return this.points.map(pt => ({ ...pt }));
    }

    fromJSON(x: any) {
        if (x) {
            this.points = x;
            this.objectNode.receive(this.objectNode.inlets[0], "bang");
            if (this.objectNode.patch.onNewMessage) {
                this.objectNode.patch.onNewMessage(
                    this.objectNode.id,
                    this.updates++);
            }
        }
    }

    addBreakPoint(x: Point) {
        this.points.push(x);
        this.update();
    }

    update() {
        publish("statechanged", {
            node: this.objectNode,
            state: this.getJSON()
        });
    }

    private clampY(value: number): number {
        return Math.min(Math.max(value, 0), 1);
    }

    private bezierInterpolate(t: number, p0: number, p1: number, p2: number, p3: number): number {
        const oneMinusT = 1 - t;
        return oneMinusT * oneMinusT * oneMinusT * p0
            + 3 * oneMinusT * oneMinusT * t * p1
            + 3 * oneMinusT * t * t * p2
            + t * t * t * p3;
    }

    toBufferList(): Float32Array {
        if (this.points.length < 2) {
            return new Float32Array([]);
        }
        let interpolatedList = new Array(1000).fill(0);
        let sortedPoints = [...this.points].sort((a, b) => a.x - b.x);

        let currentSegmentIndex = 0;
        for (let i = 0; i < 1000; i++) {
            // Calculate t based on x position
            const t = (i - sortedPoints[currentSegmentIndex].x) / (sortedPoints[currentSegmentIndex + 1].x - sortedPoints[currentSegmentIndex].x);

            if (t >= 0 && t <= 1) {
                // If within the current segment, perform Bézier interpolation
                const { cp1, cp2 } = this.calculateControlPoints(sortedPoints[currentSegmentIndex], sortedPoints[currentSegmentIndex + 1], 1);

                interpolatedList[i] = this.bezierInterpolate(t, sortedPoints[currentSegmentIndex].y, cp1.y, cp2.y, sortedPoints[currentSegmentIndex + 1].y);
            } else if (t > 1 && currentSegmentIndex < sortedPoints.length - 2) {
                // Move to the next segment
                currentSegmentIndex++;
                i--; // Re-evaluate this x position in the context of the next segment
            }
        }

        return new Float32Array(interpolatedList);
    }

    // Linear interpolation between two points
    private linearInterpolate(point1: Point, point2: Point, x: number): number {
        const slope = (point2.y - point1.y) / (point2.x - point1.x);
        return point1.y + slope * (x - point1.x);
    }

    toList() {
        let points = [... this.points].sort((a, b) => a.x - b.x);
        let _points: number[] = [];
        let prevX = 0;

        for (let i = 1; i < points.length; i++) {
            let pt = points[i];
            let x = pt.x - prevX;
            _points.push(x);
            _points.push(pt.y);

            prevX = pt.x;
        }
        return _points;
    }

    /*
    private calculateControlPoints(point1: Point, point2: Point): { cp1: Point; cp2: Point } {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;

        // Adjust the curvature strength
        const curvatureStrength = 100; // This can be adjusted for more or less curvature

        // Calculate control points based on the curvature of the starting point
        const cp1: Point = {
            x: point1.x + dx * 0.5, // Midpoint for x
            y: point1.y + dy * 0.5 + (point1.c || 0) * curvatureStrength
        };
        const cp2: Point = {
            x: point2.x - dx * 0.5, // Midpoint for x
            y: point2.y - dy * 0.5 + (point1.c || 0) * curvatureStrength
        };

        return { cp1, cp2 };
    }
    */

    private calculateControlPoints(point1: Point, point2: Point, factor = 1): { cp1: Point; cp2: Point } {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;

        // Modify the influence of curvature on the control point positions
        const curvatureInfluence = ((point1.c || 0) * 0.5 + 0.5) * factor; // Scale from -1 to 1 to 0 to 1
        const c1 = (point1.c || 0); // Scale from -1 to 1 to 0 to 1

        const curvatureStrength = Math.abs(0.5 * c1) * dy * -1; // This can be adjusted for more or less curvature

        const cp1: Point = {
            x: point1.x + dx * curvatureInfluence, // Adjust x based on curvature
            y: point1.y + dy * 0.5 + (c1 || 0) * curvatureStrength
        };
        const cp2: Point = {
            x: point2.x - dx * (1 - curvatureInfluence), // Adjust x based on curvature
            y: point2.y - dy * 0.5 + (c1 || 0) * curvatureStrength
        };

        return { cp1, cp2 };
    }

    toSVGPaths(width: number, height: number): string[] {
        let pts = this.points.map(pt => ({ x: width * pt.x / 1000, y: (1 - pt.y) * height, c: pt.c }));
        let sortedPoints = [...pts].sort((a, b) => a.x - b.x);
        let paths: string[] = [];

        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const point1 = sortedPoints[i];
            const point2 = sortedPoints[i + 1];

            const { cp1, cp2 } = this.calculateControlPoints(point1, point2);

            const path = `M ${point1.x},${point1.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${point2.x},${point2.y}`;
            paths.push(path);
        }

        return paths;
    }
    /*
    toSVGPath(width: number, height: number): string {
        if (this.points.length === 0) {
            return '';
        }

        let pts = this.points.map(pt => ({ x: width * pt.x / 1000, y: (1 - pt.y) * height }));
        let sortedPoints = [...pts].sort((a, b) => a.x - b.x);

        let path = `M ${sortedPoints[0].x} ${sortedPoints[0].y}`;

        for (let i = 1; i < sortedPoints.length; i++) {
            let pt = sortedPoints[i];
            path += ` L ${pt.x} ${pt.y}`;
        }

        return path;
    }
    */
}

doc(
    'function',
    {
        numberOfInlets: 1,
        numberOfOutlets: 2,
        description: "function editor",
        outletNames: ["list", "interpolated list"]
    });
export const function_editor = (node: ObjectNode) => {

    if (!node.custom) {
        node.custom = new FunctionEditor(node);
    }

    return (msg: Message) => {
        return [(node.custom as FunctionEditor).toList(), (node.custom as FunctionEditor).toBufferList()];
    };
};
