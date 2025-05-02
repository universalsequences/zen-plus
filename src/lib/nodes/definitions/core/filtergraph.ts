import { publish } from "@/lib/messaging/queue";
import { ObjectNode } from "../../ObjectNode";
import { Message, MessageObject } from "../../types";
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
  filterIndex?: number; // Optional filter index for multiple filters
}

export interface Filter {
  type: FilterType;
  cutoff: number;
  resonance: number;
  gain: number;
}

export class FilterGraphValue extends MutableValue {
  filters: Filter[] = [
    {
      type: "lowpass",
      cutoff: 1000,
      resonance: 0.7,
      gain: 0,
    },
  ];
  activeFilterIndex: number = 0;

  // For backward compatibility
  get filterType(): FilterType {
    return this.filters[this.activeFilterIndex].type;
  }
  get cutoff(): number {
    return this.filters[this.activeFilterIndex].cutoff;
  }
  get resonance(): number {
    return this.filters[this.activeFilterIndex].resonance;
  }
  get gain(): number {
    return this.filters[this.activeFilterIndex].gain;
  }

  constructor(node: ObjectNode, initialValue: Partial<FilterParams> = {}) {
    super(node, 0);

    // Initialize with default filter
    if (initialValue.type) this.filters[0].type = initialValue.type;
    if (initialValue.cutoff) this.filters[0].cutoff = initialValue.cutoff;
    if (initialValue.resonance) this.filters[0].resonance = initialValue.resonance;
    if (initialValue.gain) this.filters[0].gain = initialValue.gain;
  }

  setActiveFilter(index: number) {
    // Ensure we have enough filters
    while (this.filters.length <= index) {
      this.filters.push({
        type: "lowpass",
        cutoff: 1000,
        resonance: 0.7,
        gain: 0,
      });
    }
    this.activeFilterIndex = index;
    this.updateValue();
  }

  set value(x) {
    if (x === undefined) {
      return;
    }
    if (this.executing) return;
    if (typeof x === "number" && Number.isNaN(x as number)) {
      return;
    }
    publish("statechanged", {
      node: this.objectNode,
      state: x,
    });

    this._value = x;
    this.filters = x as Filter[];

    this.updateMainThread();
  }

  getJSON() {
    return this.filters.map((x) => ({ ...x }));
  }

  fromJSON(x: any) {
    if (Array.isArray(x)) {
      this.filters = x;
    }
  }

  setFilterType(type: FilterType, filterIndex?: number) {
    const index = filterIndex !== undefined ? filterIndex : this.activeFilterIndex;
    this.ensureFilterExists(index);
    this.filters[index].type = type;
    this.updateValue();
  }

  setCutoff(freq: number, filterIndex?: number) {
    const index = filterIndex !== undefined ? filterIndex : this.activeFilterIndex;
    this.ensureFilterExists(index);
    this.filters[index].cutoff = Math.max(20, Math.min(20000, freq));
    this.updateValue();
  }

  setResonance(q: number, filterIndex?: number) {
    const index = filterIndex !== undefined ? filterIndex : this.activeFilterIndex;
    this.ensureFilterExists(index);
    this.filters[index].resonance = Math.max(0.1, Math.min(20, q));
    this.updateValue();
  }

  setGain(db: number, filterIndex?: number) {
    const index = filterIndex !== undefined ? filterIndex : this.activeFilterIndex;
    this.ensureFilterExists(index);
    this.filters[index].gain = Math.max(-40, Math.min(40, db));
    this.updateValue();
  }

  private ensureFilterExists(index: number) {
    while (this.filters.length <= index) {
      this.filters.push({
        type: "lowpass",
        cutoff: 1000,
        resonance: 0.7,
        gain: 0,
      });
    }
  }

  private updateValue() {
    // This triggers the state change notification
    this.value = this.getAllFilters();

    // Notify UX component about parameter changes
    if (this.objectNode.onNewValue) {
      this.objectNode.onNewValue(this.getAllFilters());
    }
    this.updateMainThread(undefined, this.getAllFilters());
  }

  getParams(): FilterParams {
    return {
      ...this.filters[this.activeFilterIndex],
      filterIndex: this.activeFilterIndex,
    };
  }

  getAllFilters(): Filter[] {
    return this.filters.map((x) => ({ ...x }));
  }

  getNumFilters(): number {
    return this.filters.length;
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
  node.needsUX = true;
  //node.skipCompilation = true;
  //node.needsMainThread = true;
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
  if (!node.attributes["activeFilters"]) {
    node.attributes["activeFilters"] = 1;
  }

  // Create and initialize the custom value object
  let custom: FilterGraphValue;
  if (!node.custom) {
    custom = new FilterGraphValue(node);
    node.custom = custom;

    // Initialize required number of filters based on activeFilters attribute
    const activeFilters = Number(node.attributes["activeFilters"]) || 1;
    for (let i = 0; i < activeFilters; i++) {
      if (i > 0) {
        // First filter is already created by default
        custom.ensureFilterExists(i);
      }
    }

    // Send initial parameters to UX
    if (node.onNewValue) {
      node.onNewValue({
        ...custom.getParams(),
        allFilters: custom.getAllFilters(),
        numFilters: activeFilters,
      });
    }
  } else {
    custom = node.custom as FilterGraphValue;

    // Ensure the number of filters matches the activeFilters attribute
    const activeFilters = Number(node.attributes["activeFilters"]) || 1;
    for (let i = 0; i < activeFilters; i++) {
      custom.ensureFilterExists(i);
    }
  }

  // Helper to output all parameters as a series of messages
  const outputAllParams = () => {
    const activeFilters = Number(node.attributes["activeFilters"]) || 1;
    const allFilters = custom.getAllFilters();

    const messages = [];

    // First output the number of active filters
    messages.push(["numFilters", activeFilters]);

    // Then output the parameters for each filter
    for (let i = 0; i < activeFilters; i++) {
      if (i < allFilters.length) {
        const filter = allFilters[i];
        messages.push(["type", filter.type, i]);
        messages.push(["cutoff", filter.cutoff, i]);
        messages.push(["resonance", filter.resonance, i]);
        messages.push(["gain", filter.gain, i]);
      }
    }

    return messages;
  };

  // Return the message handling function
  return (msg: Message) => {
    if (msg === "bang") {
      // Output current parameter values when banged
      return custom.getAllFilters();
    }

    if (Array.isArray(msg) && typeof msg[0] === "object") {
      custom.fromJSON(msg);
      /// note: this is being called by
      /*
      if (node.onNewValue) {
        node.onNewValue({
          ...custom.getParams(),
          allFilters: custom.getAllFilters(),
          numFilters: 1,
        });
      }
      */
      custom.updateMainThread(undefined, custom.getAllFilters(), custom.getAllFilters());

      // we are setting the entire filter
      return custom.getAllFilters();
    }

    if (typeof msg === "string") {
      msg = msg.split(" ");
    }

    if (Array.isArray(msg)) {
      // Handle message arrays for setting parameters

      // Set active filters count
      if (msg[0] === "activeFilters" && typeof msg[1] === "number") {
        const numFilters = Math.max(1, Math.min(16, msg[1])); // Limit to reasonable range
        node.attributes["activeFilters"] = numFilters;

        // Ensure we have enough filters
        for (let i = 0; i < numFilters; i++) {
          custom.ensureFilterExists(i);
        }

        // Update UI
        if (node.onNewValue) {
          node.onNewValue({
            ...custom.getParams(),
            allFilters: custom.getAllFilters(),
            numFilters: numFilters,
          });
        }

        return [["activeFilters", numFilters]];
      }

      // Set active filter index
      if (msg[0] === "activeFilter" && typeof msg[1] === "number") {
        const filterIndex = Math.max(
          0,
          Math.min(Number(node.attributes["activeFilters"]) - 1, msg[1]),
        );
        custom.setActiveFilter(filterIndex);
        return [["activeFilter", filterIndex]];
      }

      // Handle filter type setting
      if (msg[0] === "type" && typeof msg[1] === "string") {
        const filterType = msg[1] as FilterType;
        if (
          ["lowpass", "highpass", "bandpass", "notch", "peak", "lowshelf", "highshelf"].includes(
            filterType,
          )
        ) {
          // Check if a specific filter index was provided
          const filterIndex = typeof msg[2] === "number" ? msg[2] : undefined;
          custom.setFilterType(filterType, filterIndex);

          // Return the applied changes
          const appliedIndex = filterIndex !== undefined ? filterIndex : custom.activeFilterIndex;
          return custom.getAllFilters();
        }
      }

      // Handle cutoff setting
      if (msg[0] === "cutoff" && typeof msg[1] === "number") {
        const filterIndex = typeof msg[2] === "number" ? msg[2] : undefined;
        custom.setCutoff(msg[1], filterIndex);

        const appliedIndex = filterIndex !== undefined ? filterIndex : custom.activeFilterIndex;
        const appliedValue = custom.filters[appliedIndex].cutoff;
        return custom.getAllFilters();
      }

      // Handle resonance setting
      if (msg[0] === "resonance" && typeof msg[1] === "number") {
        const filterIndex = typeof msg[2] === "number" ? msg[2] : undefined;
        custom.setResonance(msg[1], filterIndex);

        const appliedIndex = filterIndex !== undefined ? filterIndex : custom.activeFilterIndex;
        const appliedValue = custom.filters[appliedIndex].resonance;
        return custom.getAllFilters();
      }

      // Handle gain setting
      if (msg[0] === "gain" && typeof msg[1] === "number") {
        const filterIndex = typeof msg[2] === "number" ? msg[2] : undefined;
        custom.setGain(msg[1], filterIndex);

        const appliedIndex = filterIndex !== undefined ? filterIndex : custom.activeFilterIndex;
        const appliedValue = custom.filters[appliedIndex].gain;
        return custom.getAllFilters();
      }

      // Return all parameters
      if (msg[0] === "getparams") {
        return custom.getAllFilters();
      }
    }

    return []; // Return empty array for unhandled messages
  };
};
