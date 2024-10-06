import { Coordinate, ObjectNode, Message } from "../../types";
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
}

doc("xy.control", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  description: "xy control",
});

export const xy_control = (node: ObjectNode) => {
  node.isResizable = true;
  if (!node.size) {
    node.size = { width: 200, height: 200 };
  }

  if (!node.custom) {
    const xy = new XYControl(node) as XYControl;
    node.custom = xy;
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
  return () => {
    if (node.onNewValue) {
      node.onNewValue(counter++);
    }
    if (node.custom) {
      return [[...(node.custom as XYControl).getPoints()]];
    }
    return [];
  };
};
