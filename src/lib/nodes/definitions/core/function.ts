import { ListPool } from "@/lib/lisp/ListPool";
import { doc } from "./doc";
import { publish } from "@/lib/messaging/queue";
import type { AttributeValue, Message, ObjectNode } from "@/lib/nodes/types";
import { VMEvaluation } from "@/workers/vm/VM";

export interface Point {
  x: number;
  y: number;
  c?: number;
}

export class FunctionEditor {
  points: Point[];
  objectNode: ObjectNode;
  updates: number;
  _value: Message;
  adsr: boolean;
  listPool: ListPool;

  constructor(objectNode: ObjectNode) {
    this.objectNode = objectNode;
    this.points = [];
    this.updates = 0;
    this._value = 0;
    this.adsr = false;
    this.listPool = new ListPool();
  }

  get value() {
    return this._value;
  }

  set value(x: Message) {
    this.fromJSON(x);
  }

  getJSON() {
    return this.points.map((pt) => ({ ...pt }));
  }

  fromJSON(x: Message) {
    if (Array.isArray(x)) {
      this.points = x as Point[];
      if (this.objectNode) {
        this.objectNode.receive(this.objectNode.inlets[0], "bang");
        this.updateUX();
      }
    }
  }

  updateUX() {
    if (this.objectNode?.patch.onNewMessage) {
      this.objectNode.patch.onNewMessage(this.objectNode.id, this.updates++);
    }
    this.update();
    this.updateMainThread();
  }

  updateMainThread() {
    const evaluation: VMEvaluation = {
      instructionsEvaluated: [],
      replaceMessages: [],
      objectsEvaluated: [],
      mainThreadInstructions: [],
      optimizedMainThreadInstructions: [],
      onNewValue: [
        {
          nodeId: this.objectNode.id,
          value: this.getJSON(),
        },
      ],
      onNewSharedBuffer: [],
      mutableValueChanged: [
        {
          nodeId: this.objectNode.id,
          value: this.getJSON(),
        },
      ],
      onNewValues: [],
      attributeUpdates: [],
      onNewStepSchema: [],
    };
    this.objectNode.patch.vm?.sendEvaluationToMainThread?.(evaluation, false);
  }

  addBreakPoint(x: Point) {
    if (this.adsr) {
      return;
    }
    this.points.push(x);
    this.update();
  }

  update() {
    if (!this.objectNode) return;
    publish("statechanged", {
      node: this.objectNode,
      state: this.getJSON(),
    });
  }

  private bezierInterpolate(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const oneMinusT = 1 - t;
    return (
      oneMinusT * oneMinusT * oneMinusT * p0 +
      3 * oneMinusT * oneMinusT * t * p1 +
      3 * oneMinusT * t * t * p2 +
      t * t * t * p3
    );
  }

  toBufferList(): Float32Array {
    if (this.points.length < 2) {
      return new Float32Array([]);
    }
    this.listPool.releaseUsed();
    const interpolatedList = this.listPool.get() as number[];
    for (let i = 0; i < 1000; i++) {
      interpolatedList[i] = 0;
    }
    const sortedPoints = [...this.points].sort((a, b) => a.x - b.x);

    let currentSegmentIndex = 0;
    for (let i = 0; i < 1000; i++) {
      // Calculate t based on x position
      const t =
        (i - sortedPoints[currentSegmentIndex].x) /
        (sortedPoints[currentSegmentIndex + 1].x - sortedPoints[currentSegmentIndex].x);

      if (t >= 0 && t <= 1) {
        const a = sortedPoints[currentSegmentIndex];
        const b = sortedPoints[currentSegmentIndex + 1];
        // If within the current segment, perform Bézier interpolation

        if (!a.c && !b.c) {
          interpolatedList[i] = a.y * (1 - t) + b.y * t;
        } else {
          const { cp1, cp2 } = this.calculateControlPoints(a, b, 1);

          interpolatedList[i] = this.bezierInterpolate(
            t,
            sortedPoints[currentSegmentIndex].y,
            cp1.y,
            cp2.y,
            sortedPoints[currentSegmentIndex + 1].y,
          );
        }
      } else if (t > 1 && currentSegmentIndex < sortedPoints.length - 2) {
        // Move to the next segment
        currentSegmentIndex++;
        i--; // Re-evaluate this x position in the context of the next segment
      }
    }

    const arr = this.listPool.getFloat32Array(1000);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = interpolatedList[i];
    }
    return arr;
  }

  toList() {
    const points = [...this.points].sort((a, b) => a.x - b.x);
    const _points: number[] = [];
    let prevX = 0;

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const x = pt.x - prevX;
      _points.push(x);
      _points.push(pt.y);

      prevX = pt.x;
    }
    return _points;
  }

  private calculateControlPoints(
    point1: Point,
    point2: Point,
    factor = 1,
  ): { cp1: Point; cp2: Point } {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;

    // Modify the influence of curvature on the control point positions
    const curvatureInfluence = ((point1.c || 0) * 0.5 + 0.5) * factor; // Scale from -1 to 1 to 0 to 1
    const c1 = point1.c || 0; // Scale from -1 to 1 to 0 to 1

    const curvatureStrength = Math.abs(0.5 * c1) * dy * -1; // This can be adjusted for more or less curvature

    const cp1: Point = {
      x: point1.x + dx * curvatureInfluence, // Adjust x based on curvature
      y: point1.y + dy * 0.5 + (c1 || 0) * curvatureStrength,
    };
    const cp2: Point = {
      x: point2.x - dx * (1 - curvatureInfluence), // Adjust x based on curvature
      y: point2.y - dy * 0.5 + (c1 || 0) * curvatureStrength,
    };

    return { cp1, cp2 };
  }

  toSVGPaths(width: number, height: number): string[] {
    const pts = this.points.map((pt) => ({
      x: (width * pt.x) / 1000,
      y: (1 - pt.y) * height,
      c: pt.c,
    }));
    const sortedPoints = [...pts].sort((a, b) => a.x - b.x);
    const paths: string[] = [];

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const point1 = sortedPoints[i];
      const point2 = sortedPoints[i + 1];

      const { cp1, cp2 } = this.calculateControlPoints(point1, point2);

      const path = `M ${point1.x},${point1.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${point2.x},${point2.y}`;
      paths.push(path);
    }

    return paths;
  }
}

doc("function", {
  numberOfInlets: 1,
  numberOfOutlets: 7,
  description: "function editor",
  outletNames: [
    "list",
    "interpolated list",
    "attack-decay interpolated list",
    "release list",
    "attack-decay size",
    "sustain",
    "release size",
  ],
});
export const function_editor = (node: ObjectNode) => {
  if (!node.custom) {
    node.custom = new FunctionEditor(node);
  }

  if (!node.attributes.divisions) {
    node.attributes.divisions = 4;
  }

  if (!node.attributes.adsr) {
    node.attributes.adsr = false;
  }

  node.attributeDefaults.adsr = false;

  node.attributeCallbacks.adsr = (message: AttributeValue) => {
    const editor = node.custom as FunctionEditor;
    if (message && editor) {
      if (editor.points.length === 5) {
        editor.adsr = true;
        return;
      }

      editor.addBreakPoint({ x: 0 * 1000, y: 0 });
      editor.addBreakPoint({ x: 0.1 * 1000, y: 1 });
      editor.addBreakPoint({ x: 0.5 * 1000, y: 0.5 });
      editor.addBreakPoint({ x: 0.75 * 1000, y: 0.5 });
      editor.addBreakPoint({ x: 1 * 1000, y: 0 });
      editor.adsr = true;
    }
  };

  if (node.attributes.adsr) {
    node.attributeCallbacks.adsr(true);
  }

  node.needsLoad = true;

  const collect = () => {
    const editor = node.custom as FunctionEditor;
    if (editor.adsr) {
      const ed1 = new FunctionEditor(node);
      ed1.points = editor.points.slice(0, 3);
      const ed2 = new FunctionEditor(node);
      ed2.points = editor.points.slice(3);
      const attackDecay = ed1.points[2].x;
      const release = 1000 - ed2.points[0].x;

      ed1.points = scaleAttackDecay(attackDecay, ed1.points);
      ed2.points = scaleRelease(release, ed2.points);
      const releaseBufferList = ed2.toBufferList();
      releaseBufferList[999] = 0;
      return [
        editor.toList(),
        editor.toBufferList(),
        ed1.toBufferList(),
        releaseBufferList,
        attackDecay,
        ed1.points[2].y,
        release,
      ];
    }
    return [
      (node.custom as FunctionEditor).toList(),
      (node.custom as FunctionEditor).toBufferList(),
    ];
  };

  type Operation = {
    [x: string]: (...v: number[]) => Message[];
  };
  const ops: Operation = {
    attack: (attack: number) => {
      const editor = node.custom as FunctionEditor;
      editor.points[1].x = Math.min(attack, editor.points[2].x);
      editor.updateUX();
      return collect();
    },
    decay: (decay: number) => {
      const editor = node.custom as FunctionEditor;
      editor.points[2].x = editor.points[1].x + decay;
      editor.updateUX();
      return collect();
    },
    release: (release: number) => {
      const editor = node.custom as FunctionEditor;
      editor.points[3].x = Math.max(editor.points[2].x, 1000 - release);
      editor.updateUX();
      return collect();
    },
    sustain: (sustain: number) => {
      const editor = node.custom as FunctionEditor;
      editor.points[2].y = sustain;
      editor.points[3].y = sustain;
      editor.updateUX();
      return collect();
    },
    "add-break-point": (x: number, y: number) => {
      const editor = node.custom as FunctionEditor;
      editor.addBreakPoint({ x, y });
      editor.updateUX();
      return collect();
    },
    curve: (idx: number, curve: number) => {
      const editor = node.custom as FunctionEditor;
      if (editor.points[idx]) {
        editor.points[idx].c = Math.max(-1, Math.min(1, curve));
      }
      editor.updateUX();
      return collect();
    },
  };

  return (msg: Message) => {
    if (typeof msg === "string") {
      const tokens = msg.split(" ");
      const op = ops[tokens[0]];
      if (op) {
        if (tokens.length === 2) {
          const val = Number.parseFloat(tokens[1]);
          if (Number.isNaN(val)) return [];
          return op(val);
        }
        const a = Number.parseFloat(tokens[1]);
        const b = Number.parseFloat(tokens[2]);
        if (Number.isNaN(a) || Number.isNaN(b)) return [];
        return op(a, b);
      }
    } else if (Array.isArray(msg) && msg[0] === "set-points") {
      console.log("object set points=", msg.slice(1));
      const editor = node.custom as FunctionEditor;
      editor.points = msg.slice(1) as Point[];
      editor.updateUX();
      return collect();
    }
    if (msg === "bang") {
      return collect();
    }

    return [];
  };
};

const scaleAttackDecay = (length: number, points: Point[]): Point[] => {
  const pts: Point[] = [];

  for (const pt of points) {
    pts.push({
      x: (1000 * pt.x) / length,
      y: pt.y,
      c: pt.c,
    });
  }
  return pts;
};

const scaleRelease = (length: number, points: Point[]): Point[] => {
  const pts: Point[] = [];
  const start = points[0].x;

  for (const pt of points) {
    pts.push({
      x: (1000 * (pt.x - start)) / length,
      y: pt.y,
      c: pt.c,
    });
  }
  return pts;
};
