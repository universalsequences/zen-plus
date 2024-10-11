import { Lazy, Message, NodeFunction, ObjectNode } from "@/lib/nodes/types";
import { API } from "@/lib/nodes/context";
import { getPoints } from "./utils";
import { doc } from "../doc";
import { BlockGen, data } from "@/lib/zen/data";
import { createSpiderWeb, SpiderWeb } from "@/lib/zen/physical-modeling/web-maker";
import { Component } from "@/lib/zen/physical-modeling/Component";
import { Statement, CompoundOperator } from "../types";
import { LazyMaterial } from "./types";

/**
 * membrane module:
 *     - 2D physical modeling of a membrane surface
 *     - define components and link them together
 */

doc("modeling.component", {
  inletNames: ["connected component", "x", "y", "pitch", "release", "noise", "couplingCoefficient"],
  numberOfInlets: 7,
  numberOfOutlets: 2,
  description:
    "creates a component for a membrane physical model (can be connected with other component)",
  outletNames: ["component"],
});

export const modeling_component = (
  node: ObjectNode,
  x: Lazy,
  y: Lazy,
  pitch: Lazy,
  release: Lazy,
  noise: Lazy,
  couplingCoefficient: Lazy,
) => {
  node.needsLoad = true;
  if (!node.attributes.depth) {
    node.attributes.depth = 2;
  }
  if (!node.attributes.radius) {
    node.attributes.radius = 5;
  }
  let web: SpiderWeb;
  let returnedUpstream = false;
  return (msg: Message) => {
    if (msg === "bang" && returnedUpstream) {
      return [];
    }
    if (Array.isArray(msg)) {
      if (msg[0] === "coeff") {
        if (web.data?.set && ArrayBuffer.isView(msg[1])) {
          web.data.set(msg[1] as Float32Array);
        }
      }
    }

    if (node.inlets[0].connections.length > 0 && msg === "bang") {
      return [];
    }

    // if msg === "bang" (and not the initial bang) then we are just creating this... and this is the
    // entry point by design

    const material: LazyMaterial = {
      x: x() as Statement,
      y: y() as Statement,
      pitch: pitch() as Statement,
      release: release() as Statement,
      noise: noise() as Statement,
      couplingCoefficient: couplingCoefficient() as Statement,
    };

    web = createSpiderWeb(node.attributes.depth as number, node.attributes.radius as number);
    console.log(web);

    // todo: all data needs to be stored in the node so that it persists
    // and can be saved...

    const coeffBuffer: BlockGen = data(web.size, web.size, web.coeffs, true, "none");
    web.data = coeffBuffer;
    const points = getPoints(web);
    web.pointsData = data(points.length, 1, points, true, "none");
    web.points = points;

    const modelComponent: LazyComponent = {
      web,
      material,
      connection: undefined,
      component: undefined,
    };
    if (msg !== "bang" && Array.isArray(msg)) {
      const compoundOperator = msg[0] as CompoundOperator;
      if (compoundOperator.modelComponent) {
        modelComponent.connection = compoundOperator.modelComponent;
        returnedUpstream = true;
      }
    }

    const statement: Statement = [
      {
        name: "modeling.component",
        modelComponent,
      },
    ];

    statement.node = node;

    return [statement, web] as Message[];
  };
};

doc("modeling.synth", {
  description: "plays the membrane physical model",
  numberOfInlets: 2,
  numberOfOutlets: 1,
  inletNames: ["trigger", "components"],
});

export const modeling_synth = (node: ObjectNode, component: Lazy) => {
  return (trigger: Message) => {
    let c = component() as Statement;
    if (Array.isArray(c)) {
      let operator = c[0] as CompoundOperator;
      if (!operator.modelComponent) {
        return [];
      }
      let modelComponent = operator.modelComponent;

      // need to put all the components together going up the data structure
      // and pulling all the components?

      let modelComponents = [modelComponent];
      while (modelComponent.connection) {
        modelComponent = modelComponent.connection;
        if (modelComponent) {
          modelComponents.push(modelComponent);
        }
      }

      modelComponent = operator.modelComponent;
      let ret = [];
      let isEntryPoint = modelComponent.connection === undefined;
      let statement: Statement = [
        { name: "modeling.synth", modelComponent, modelComponents },
        (isEntryPoint ? trigger : 0) as Statement,
      ];
      ret.push(statement);
      statement.node = { ...node, id: node.id + "_" + 0 };
      let i = 0;
      while (modelComponent.connection) {
        modelComponent = modelComponent.connection;
        if (modelComponent) {
          i++;
          let isEntryPoint = modelComponent.connection === undefined;
          let statement: Statement = [
            { name: "modeling.synth", modelComponent, modelComponents },
            (isEntryPoint ? trigger : 0) as Statement,
          ];
          statement.node = { ...node, id: node.id + "_" + i };
          ret.push(statement);
          if (!node.outlets[i]) {
            node.newOutlet();
          }
        }
      }

      for (let i = 0; i < node.outlets.length; i++) {
        node.outlets[i].name = `component ${i + 1} output`;
      }

      // entry point is first so we reverse...
      ret.reverse();
      return ret;
    }

    return [];
  };
};

export interface LazyComponent {
  web: SpiderWeb;
  material: LazyMaterial;
  connection: LazyComponent | undefined;
  component: Component | undefined; // once the 1st stage compiler evalualates, it will set this field
}

export const membraneAPI: API = {
  "modeling.component": modeling_component,
  "modeling.synth": modeling_synth,
};
