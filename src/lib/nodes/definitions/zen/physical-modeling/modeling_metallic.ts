import { MetallicComponent } from "@/lib/zen/physical-modeling/MetallicComponent";
import { LazyMaterial } from "./types";
import { Statement } from "../types";
import { MetallicWeb, createGongWeb } from "@/lib/zen/physical-modeling/metallic-web-generator";
import { doc } from "../doc";
import type { Message, Lazy, ObjectNode } from "@/lib/nodes/types";

export interface LazyMetallicMaterial extends LazyMaterial {
  stiffness: Statement;
  brightness: Statement;
  nonlinearity: Statement;
  modeCoupling: Statement;
  inharmonicity: Statement;
  hfDamping: Statement;
}

export interface LazyMetallicComponent {
  web: MetallicWeb;
  material: LazyMetallicMaterial;
  component?: MetallicComponent; // once the 1st stage compiler evalualates, it will set this field
}

doc("modeling.metallic", {
  description: "physical model for metallic sounds",
  numberOfInlets: 12,
  numberOfOutlets: 1,
  inletNames: [
    "trigger",
    "x",
    "y",
    "pitch",
    "release",
    "noise",
    "stiffness",
    "brightness",
    "nonlinearity",
    "inharmonicity",
    "modeCoupling",
    "hfDamping",
  ],
});

export const modeling_metallic = (
  _node: ObjectNode,
  x: Lazy,
  y: Lazy,
  pitch: Lazy,
  release: Lazy,
  noise: Lazy,
  stiffness: Lazy,
  brightness: Lazy,
  nonlinearity: Lazy,
  inharmonicity: Lazy,
  modeCoupling: Lazy,
  hfDampening: Lazy,
) => {
  return (trigger: Message) => {
    const material: LazyMetallicMaterial = {
      x: x() as Statement,
      y: y() as Statement,
      pitch: pitch() as Statement,
      release: release() as Statement,
      noise: noise() as Statement,
      couplingCoefficient: 0 as Statement,
      stiffness: stiffness() as Statement,
      brightness: brightness() as Statement,
      nonlinearity: nonlinearity() as Statement,
      inharmonicity: inharmonicity() as Statement,
      modeCoupling: modeCoupling() as Statement,
      hfDamping: hfDampening() as Statement,
    };

    const web = createGongWeb(16);
    console.log("gong web=", web);

    const statement: Statement = [
      {
        name: "modeling.metallic",
        metallicComponent: {
          web,
          material,
          component: undefined,
        } as LazyMetallicComponent,
      },
      trigger as Statement,
    ];
    statement.node = _node;
    console.log("metallic statement=", statement);
    return [statement] as Message[];
  };
};
