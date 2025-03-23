import type { AttributeValue, Message, ObjectNode, SerializableCustom } from "@/lib/nodes/types";
import { doc } from "../doc";
import { publish } from "@/lib/messaging/queue";

// Class to handle tab data, implementing SerializableCustom
class TabData implements SerializableCustom {
  private _value: number = 0;
  private objectNode: ObjectNode;
  private scriptingNameCache: { [tabIndex: number]: string[] | null } = {};

  constructor(node: ObjectNode) {
    this.objectNode = node;
  }

  // Get the scripting names for a specific tab
  getScriptingNames(tabIndex: number): string[] {
    // Check cache first
    if (this.scriptingNameCache[tabIndex]) {
      return this.scriptingNameCache[tabIndex] || [];
    }

    // Parse the tab content from attributes
    const tabContent = this.objectNode.attributes[`tab${tabIndex}`];
    if (!tabContent || typeof tabContent !== "string") {
      return [];
    }

    // Parse comma-separated scripting names
    const scriptingNames = tabContent
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    // Cache the result
    this.scriptingNameCache[tabIndex] = scriptingNames;

    return scriptingNames;
  }

  // Get all scripting names from all tabs
  getAllScriptingNames(): Map<string, number> {
    const result = new Map<string, number>();

    // Get the number of tabs from options
    const optionsString = (this.objectNode.attributes["options"] as string) || "";
    const tabCount = optionsString.split(",").filter(Boolean).length;

    // Collect scripting names from each tab
    for (let i = 0; i < tabCount; i++) {
      const tabScriptingNames = this.getScriptingNames(i);
      for (const name of tabScriptingNames) {
        result.set(name, i);
      }
    }

    return result;
  }

  // Clear the scripting name cache for a specific tab
  clearTabCache(tabIndex: number) {
    this.scriptingNameCache[tabIndex] = null;
  }

  // Clear the entire cache
  clearCache() {
    this.scriptingNameCache = {};
  }

  // Update visibility of objects based on selected tab
  updateVisibility(selectedTabIndex: number) {
    // Get all scripting names from all tabs
    const allScriptingNames = this.getAllScriptingNames();

    // Get the scripting names for the selected tab
    const selectedTabScriptingNames = this.getScriptingNames(selectedTabIndex);

    // Get all objects with scripting names
    const allNodesWithScriptingNames = this.objectNode.patch.getAllNodes().filter((obj) => {
      const scriptingName = obj.attributes["scripting name"];
      return scriptingName && typeof scriptingName === "string" && scriptingName.trim() !== "";
    });

    console.log("update visibility", selectedTabIndex, selectedTabScriptingNames);

    // Update visibility for each object
    for (const obj of allNodesWithScriptingNames) {
      const scriptingName = obj.attributes["scripting name"] as string;

      // If the object is in the selected tab, show it
      if (selectedTabScriptingNames.includes(scriptingName)) {
        obj.setAttribute("Include in Presentation", true);
      }
      // If the object is in any tab, hide it when not in its tab
      else if (allScriptingNames.has(scriptingName)) {
        obj.setAttribute("Include in Presentation", false);
      }
      // Objects not in any tab are left unchanged
    }

    // Store selected tab index
    this._value = selectedTabIndex;

    // Send output messages
    const optionsString = (this.objectNode.attributes["options"] as string) || "";
    const tabOptions = optionsString
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean);

    this.objectNode.send(this.objectNode.outlets[0], tabOptions[selectedTabIndex] || "");
    this.objectNode.send(this.objectNode.outlets[1], selectedTabIndex);

    // Publish state change
    publish("statechanged", {
      node: this.objectNode,
      state: selectedTabIndex,
    });
  }

  // SerializableCustom implementation
  get value(): Message {
    return this._value;
  }

  set value(newValue: Message) {
    if (typeof newValue === "number") {
      const optionsString = (this.objectNode.attributes["options"] as string) || "";
      const tabOptions = optionsString
        .split(",")
        .map((opt) => opt.trim())
        .filter(Boolean);

      // Clamp the index to valid range
      const index = Math.min(Math.max(0, Math.floor(newValue as number)), tabOptions.length - 1);

      // Update visibility based on selected tab
      this.updateVisibility(index);
    }
  }

  getJSON() {
    return this._value;
  }

  fromJSON(data: any) {
    if (typeof data === "number") {
      this._value = data;
      // Initialize with the stored tab index
      setTimeout(() => {
        this.updateVisibility(this._value);
      }, 100);
    }
  }

  execute(tabIndex?: number) {
    if (tabIndex !== undefined) {
      this.value = tabIndex;
    }
  }
}

doc("tab", {
  numberOfInlets: 1,
  numberOfOutlets: 2,
  inletNames: ["index"],
  outletNames: ["selected tab", "selected index"],
  description:
    "Create a tabbed interface to organize objects in presentation mode. Objects are shown/hidden based on tab selection.\n\nEach tab is defined in the 'options' attribute as a comma-separated list. Objects to be shown in each tab are defined in the 'tab0', 'tab1', etc. attributes as comma-separated lists of scripting names.\n\nYou can customize the appearance with these attributes:\n- accent-color: color of the selected tab indicator (default: #2ad4bf)\n- base-color: background color (default: #27272a)\n- active-color: selected tab background color (default: #3f3f46)",
});

export const tab = (node: ObjectNode) => {
  node.needsMainThread = true;
  node.skipCompilation = true;
  node.isResizable = true;

  // Set default size
  if (!node.size) {
    node.size = { width: 300, height: 30 };
  }

  // Initialize options attribute
  if (!node.attributes["options"]) {
    node.attributes["options"] = "Tab 1,Tab 2";
  }

  // Initialize color attributes with defaults
  if (!node.attributes.hasOwnProperty("accent-color")) {
    node.attributes["accent-color"] = "#2ad4bf"; // Default teal accent color
  }

  if (!node.attributes.hasOwnProperty("base-color")) {
    node.attributes["base-color"] = "#27272a"; // Dark background color
  }

  if (!node.attributes.hasOwnProperty("active-color")) {
    node.attributes["active-color"] = "#3f3f46"; // Selected tab background color
  }

  // Initialize TabData as custom data
  if (!node.custom) {
    node.custom = new TabData(node);
  }

  // Setup attribute callback for handling options
  node.attributeCallbacks.options = (value: AttributeValue) => {
    if (typeof value !== "string") return;

    // Parse comma-separated options
    const tabOptions = value
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean);

    // Create or update attributes for each tab
    for (let i = 0; i < tabOptions.length; i++) {
      // Check if attribute exists, if not initialize it with empty string
      if (!node.attributes.hasOwnProperty(`tab${i}`)) {
        node.attributes[`tab${i}`] = "";
      }
    }

    // Remove old tab attributes if there are fewer tabs now
    const attributeNames = Object.keys(node.attributes);
    attributeNames.forEach((attrName) => {
      if (attrName.startsWith("tab") && attrName !== "tab") {
        const tabIndex = parseInt(attrName.replace("tab", ""));
        if (!isNaN(tabIndex) && tabIndex >= tabOptions.length) {
          delete node.attributes[attrName];
        }
      }
    });

    // Clear the cache when options change
    (node.custom as TabData).clearCache();

    // Ensure the selected tab index is still valid
    const currentTabIndex = (node.custom as TabData).value as number;
    if (currentTabIndex >= tabOptions.length) {
      (node.custom as TabData).value = tabOptions.length - 1;
    }
  };

  // Setup callbacks for tab content attributes
  for (let i = 0; i < 10; i++) {
    // Support up to 10 tabs
    node.attributeCallbacks[`tab${i}`] = (value: AttributeValue) => {
      if (!node.custom) return;

      // Clear the cache for this tab when its contents change
      (node.custom as TabData).clearTabCache(i);

      // If this is the currently selected tab, update visibility
      if ((node.custom as TabData).value === i) {
        (node.custom as TabData).updateVisibility(i);
      }
    };
  }

  // Initialize tab attributes
  if (typeof node.attributes["options"] === "string") {
    node.attributeCallbacks.options(node.attributes["options"]);
  }

  // Initialize visibility with the default tab (0) or stored value
  setTimeout(() => {
    if (!node.custom) return;
    const tabIndex = ((node.custom as TabData).value as number) || 0;
    (node.custom as TabData).updateVisibility(tabIndex);
  }, 100);

  // Handler for incoming messages
  return (message: Message) => {
    // Accept only numbers to switch tabs
    if (typeof message === "number" && node.custom) {
      (node.custom as TabData).value = message;
    }
    return [];
  };
};
