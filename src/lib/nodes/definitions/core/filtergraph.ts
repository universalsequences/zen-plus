import { ObjectNode } from "../../ObjectNode";
import { Message } from "../../types";
import { doc } from "./doc";
import { MutableValue } from "./MutableValue";

export type FilterType =
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "notch"
  | "peak"
  | "lowshelf"
  | "highshelf";

export interface FilterParams {
  type: FilterType;
  cutoff: number;
  resonance: number;
  gain: number;
}

export class FilterGraphValue extends MutableValue {
  filterType: FilterType = "lowpass";
  cutoff: number = 1000;
  resonance: number = 0.7;
  gain: number = 0;

  constructor(node: ObjectNode, initialValue: Partial<FilterParams> = {}) {
    super(node, 0);
    if (initialValue.type) this.filterType = initialValue.type;
    if (initialValue.cutoff) this.cutoff = initialValue.cutoff;
    if (initialValue.resonance) this.resonance = initialValue.resonance;
    if (initialValue.gain) this.gain = initialValue.gain;
  }

  setFilterType(type: FilterType) {
    this.filterType = type;
    this.updateValue();
  }

  setCutoff(freq: number) {
    this.cutoff = Math.max(20, Math.min(20000, freq));
    this.updateValue();
  }

  setResonance(q: number) {
    this.resonance = Math.max(0.1, Math.min(20, q));
    this.updateValue();
  }

  setGain(db: number) {
    this.gain = Math.max(-40, Math.min(40, db));
    this.updateValue();
  }

  private updateValue() {
    // This triggers the state change notification
    this.value = this.value + 1;

    // Notify UX component about parameter changes
    if (this.objectNode.onNewValue) {
      this.objectNode.onNewValue(this.getParams());
    }
  }

  getParams(): FilterParams {
    return {
      type: this.filterType,
      cutoff: this.cutoff,
      resonance: this.resonance,
      gain: this.gain,
    };
  }
}

// Document the object with its inlets and outlets
doc("filtergraph", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  inletNames: ["message"],
  outletNames: ["parameters"],
  description: `A visual interface for designing filters, similar to Max/MSP's filtergraph~.
  Displays filter frequency response curves and outputs messages with filter parameters.
  Supported filter types: lowpass, highpass, bandpass, notch, peak, lowshelf, highshelf.
  Parameters: cutoff (20-20000 Hz), resonance (0.1-20), gain (-40 to 40 dB, for peaking and shelf filters).`,
});

export const filtergraph = (node: ObjectNode) => {
  // Make the node resizable with default size
  node.needsLoad = true;
  node.isResizable = true;
  node.skipCompilation = true;
  node.needsMainThread = true;
  if (!node.size) {
    node.size = { width: 200, height: 100 };
  }

  // Set default attributes
  if (!node.attributes["backgroundColor"]) {
    node.attributes["backgroundColor"] = "#303030";
  }
  if (!node.attributes["curveColor"]) {
    node.attributes["curveColor"] = "#ff9500";
  }
  if (!node.attributes["gridColor"]) {
    node.attributes["gridColor"] = "#666666";
  }
  if (!node.attributes["textColor"]) {
    node.attributes["textColor"] = "#ffffff";
  }

  // Create and initialize the custom value object
  let custom: FilterGraphValue;
  if (!node.custom) {
    custom = new FilterGraphValue(node);
    node.custom = custom;

    // Send initial parameters to UX
    if (node.onNewValue) {
      node.onNewValue(custom.getParams());
    }
  } else {
    custom = node.custom as FilterGraphValue;
  }

  // Helper to output all parameters as a series of messages
  const outputAllParams = () => {
    const params = custom.getParams();
    return [
      ["type", params.type],
      ["cutoff", params.cutoff],
      ["resonance", params.resonance],
      ["gain", params.gain],
    ];
  };

  // Return the message handling function
  return (msg: Message) => {
    if (msg === "bang") {
      // Output current parameter values when banged
      return outputAllParams();
    }

    if (typeof msg === "string") {
      msg = msg.split(" ");
    }

    if (Array.isArray(msg)) {
      console.log("type...", msg);
      // Handle message arrays for setting parameters
      if (msg[0] === "type" && typeof msg[1] === "string") {
        const filterType = msg[1] as FilterType;
        if (
          ["lowpass", "highpass", "bandpass", "notch", "peak", "lowshelf", "highshelf"].includes(
            filterType,
          )
        ) {
          console.log("setting filtertype", filterType);
          custom.setFilterType(filterType);
          // onNewValue is called in setFilterType via updateValue
          return [["type", filterType]];
        }
      }

      if (msg[0] === "cutoff" && typeof msg[1] === "number") {
        custom.setCutoff(msg[1]);
        // onNewValue is called in setCutoff via updateValue
        return [["cutoff", custom.cutoff]];
      }

      if (msg[0] === "resonance" && typeof msg[1] === "number") {
        custom.setResonance(msg[1]);
        // onNewValue is called in setResonance via updateValue
        return [["resonance", custom.resonance]];
      }

      if (msg[0] === "gain" && typeof msg[1] === "number") {
        custom.setGain(msg[1]);
        // onNewValue is called in setGain via updateValue
        return [["gain", custom.gain]];
      }

      if (msg[0] === "getparams") {
        return outputAllParams();
      }
    }

    return []; // Return empty array for unhandled messages
  };
};
