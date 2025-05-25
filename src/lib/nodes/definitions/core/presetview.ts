import { ObjectNode } from "../../types";
import { doc } from "./doc";

doc("preset.view", {
  description: "displays an external preset object with a slot statically selected",
  numberOfInlets: 1,
  numberOfOutlets: 1,
});

export const preset_view = (object: ObjectNode) => {
  object.isResizable = true;
  if (!object.size) {
    object.size = { width: 200, height: 300 };
  }
  if (!object.attributes.preset) {
    object.attributes.preset = "";
  }

  if (!object.attributes.slot) {
    object.attributes.slot = 0;
  }
  return () => [];
};
