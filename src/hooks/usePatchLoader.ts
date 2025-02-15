import React, { useCallback } from "react";
import { useRouter } from "next/router";
import { usePatch, Coordinates } from "@/contexts/PatchContext";
import { Project, useStorage } from "@/contexts/StorageContext";
import { SerializedPatch, Patch } from "@/lib/nodes/types";
import { usePosition } from "@/contexts/PositionContext";
import { usePatches } from "@/contexts/PatchesContext";
import { useLocked } from "@/contexts/LockedContext";

export const usePatchLoader = (patch: Patch) => {
  const { loadProjectPatch, loadProject } = usePatch();
  const { updatePositions, sizeIndexRef, setSizeIndex } = usePosition();
  const { fetchPatch, fetchPatchesForEmail } = useStorage();
  const router = useRouter();
  const { expandPatch } = usePatches();

  const { setLockedMode } = useLocked();
  const loadPatch = useCallback(
    async (saved: any) => {
      let id = saved.id;
      let serialized = await fetchPatch(saved);
      loadProjectPatch(serialized);
      let updates: Coordinates = {};
      let sizes = { ...sizeIndexRef.current };
      for (let node of [...patch.objectNodes, ...patch.messageNodes]) {
        updates[node.id] = node.position;
        if (node.size) {
          sizes[node.id] = node.size;
        }
      }
      setSizeIndex(sizes);
      updatePositions(updates);
      patch.previousDocId = saved.id;
      patch.previousSerializedPatch = serialized;
      // router.replace(`/editor/${id}`, undefined, { shallow: true }); // Update the URL path
      if (!patch.isExamplePatch) {
        window.history.pushState(null, "", `/editor/${id}`);
      }
      if (patch.isExamplePatch) {
        const subpatch = patch.objectNodes.find((x) => x.name === "zen");
        if (subpatch) {
          expandPatch(subpatch);
          setLockedMode(true);
        }
      }
    },
    [patch],
  );

  return loadPatch;
};
