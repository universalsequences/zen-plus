import { Coordinate, ObjectNode, Message, SerializableCustom } from "../../types";
import { doc } from "./doc";

doc("xy.control", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "xy control",
});

export class XYControl {
  points: Coordinate[];
  objectNode: ObjectNode;
  constructor(objectNode: ObjectNode) {
    this.objectNode = objectNode;
    this.points = [];
  }

  round() {
    const roundX = this.objectNode.attributes.roundX as number;
    if (roundX === 0) {
      return;
    }
    const r = 1.0 / roundX;
    const points = this.getPoints();
    const minX = this.objectNode.attributes.minX as number;
    const maxX = this.objectNode.attributes.maxX as number;
    const widthX = maxX - minX;
    for (let i = 0; i < this.points.length; i++) {
      const x = Math.round(points[i].x * r) / r;
      this.points[i].x = (x - minX) / widthX;
    }
    this.objectNode.receive(this.objectNode.inlets[0], "bang");
  }

  getPoints() {
    const minX = this.objectNode.attributes.minX as number;
    const maxX = this.objectNode.attributes.maxX as number;
    const widthX = maxX - minX;
    const minY = this.objectNode.attributes.minY as number;
    const maxY = this.objectNode.attributes.maxY as number;
    const widthY = maxY - minY;
    return this.points.map((pt) => ({
      x: minX + widthX * pt.x,
      y: minY + widthY * pt.y,
    }));
  }

  set value(v: Message) {}

  get value() {
    return this.points;
  }

  getJSON() {
    return {
      points: this.points,
    };
  }

  fromJSON(x: any) {
    this.points = x.points;
  }

  execute() {}
}

doc("xy.control", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "xy control",
});

export const xy_control = (node: ObjectNode) => {
  node.skipCompilation = true;
  node.needsMainThread = true;
  node.needsUX = true;
  node.isResizable = true;
  if (!node.size) {
    node.size = { width: 200, height: 200 };
  }

  if (!node.custom) {
    const xy = new XYControl(node) as XYControl;
    node.custom = xy as SerializableCustom;
    xy.points.push({ x: 0.3, y: 0.6 });
  }

  if (!node.attributes["labels"]) {
    node.attributes["labels"] = "";
  }

  if (!node.attributes["minX"]) {
    node.attributes["minX"] = 0;
  }

  if (!node.attributes["maxX"]) {
    node.attributes["maxX"] = 1;
  }

  if (!node.attributes["fill-color"]) {
    node.attributes["fill-color"] = "#ffffff";
  }

  if (!node.attributes["minY"]) {
    node.attributes["minY"] = 0;
  }

  if (!node.attributes["maxY"]) {
    node.attributes["maxY"] = 1;
  }

  if (!node.attributes["roundX"]) {
    node.attributes["roundX"] = 0.25;
  }

  if (!node.attributes["nodes"]) {
    node.attributes["nodes"] = 1;
    node.attributeCallbacks["nodes"] = (x: number | any) => {
      if (!node.custom) return;
      const xy = node.custom as XYControl;
      for (let i = xy.points.length; i < x; i++) {
        xy.points.push({
          x: 0.1 + i / x,
          y: 0.1 + i / x,
        });
      }
      if (node.onNewValue) node.onNewValue(counter++);
    };
  }

  let counter = 0;
  return (msg: Message) => {
    if (typeof msg === "string" && msg !== "bang") {
      const tokens = msg.split(" ");
      if (tokens.length === 3) {
        const [_idx, a, _b, _c] = tokens;
        const idx = Number.parseInt(_idx);
        const val = Number.parseFloat(_b);

        if (a === "x") {
          const xy = node.custom as XYControl;

          if (xy?.points && xy.points[idx]) {
            const minX = node.attributes.minX as number;
            const maxX = node.attributes.maxX as number;
            const widthX = maxX - minX;
            xy.points[idx].x = (val - minX) / widthX;
          }
        } else if (a === "y") {
          const xy = node.custom as XYControl;
          if (xy?.points && xy.points[idx]) {
            const minY = node.attributes.minY as number;
            const maxY = node.attributes.maxY as number;
            const widthY = maxY - minY;
            xy.points[idx].y = (val - minY) / widthY;
          }
        }
        if (node.onNewValue) {
          node.onNewValue(counter++);
        }
        return [];
      }
    }
    if (node.onNewValue) {
      node.onNewValue(counter++);
    }
    if (node.custom) {
      return [[...(node.custom as XYControl).getPoints()]];
    }
    return [];
  };
};
