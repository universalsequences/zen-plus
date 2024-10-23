import type { SubPatch, Message, Patch, ObjectNode, Lazy } from "../../types";
import { doc } from "./doc";

export interface RegisteredPatch {
  tags: string[];
  patch: SubPatch;
}

type ResolvedPatch = RegisteredPatch & {
  isPolyTrig: boolean;
};

type Mapping = {
  [id: string]: RegisteredPatch;
};

type TagMapping = {
  [id: string]: RegisteredPatch[];
};

type RegistryMapping = Mapping;

class Registry {
  registry: RegistryMapping;
  tagToPatches: TagMapping;
  constructor() {
    this.registry = {};
    this.tagToPatches = {};
  }

  register(patch: SubPatch, tags: string[]) {
    console.log("registering patch", patch.id, tags);
    if (!this.registry[patch.id]) {
      this.registry[patch.id] = {
        patch,
        tags,
      };
    }
    for (const tag of tags) {
      if (!this.tagToPatches[tag]) {
        this.tagToPatches[tag] = [];
      }
      const registeredPatch = this.registry[patch.id];
      if (!this.tagToPatches[tag].includes(registeredPatch)) {
        this.tagToPatches[tag].push(this.registry[patch.id]);
      }
    }
  }

  resolve(patch: SubPatch) {}

  query(tags: string[]): RegisteredPatch[] {
    if (tags.length === 0) {
      return [];
    }

    let matches: Set<RegisteredPatch> | null = null;

    for (const tag of tags) {
      const patchesWithTag = this.tagToPatches[tag] || [];

      if (matches === null) {
        matches = new Set(patchesWithTag);
      } else {
        matches = new Set(Array.from(matches).filter((patch) => patchesWithTag.includes(patch)));
      }

      if (matches.size === 0) {
        return [];
      }
    }

    return matches ? Array.from(matches) : [];
  }
}

export const registry = new Registry();

doc("registerpatch", {
  description: "registers patch system-wide",
  numberOfInlets: (x) => x,
  numberOfOutlets: 0,
  inletNames: ["operation"],
});

export const registerpatch = (node: ObjectNode, ...tags: Lazy[]) => {
  node.needsLoad = true;

  return (_message: Message) => {
    const tagNames: string[] = [];
    for (const tag of tags) {
      const tagName = tag();
      tagNames.push(tagName as string);
    }
    console.log("register patch called...", tagNames);
    registry.register(node.patch as SubPatch, tagNames);
    return [];
  };
};

doc("querypatch", {
  description: "queries the registry for patches with given tags",
  numberOfInlets: 1,
  numberOfOutlets: 1,
  inletNames: ["tags"],
});

export const querypatch = (node: ObjectNode) => {
  return (message: Message) => {
    let tags: string[] = [];
    if (typeof message === "string") {
      tags = message.split(" ");
    } else if (Array.isArray(message)) {
      tags = message.map((tag) => String(tag));
    }

    const results = registry.query(tags);
    return [results];
  };
};

export const registryIndex = {
  registerpatch,
  querypatch,
};
