import { useStorage } from "@/contexts/StorageContext";
import { ExpandedPatch } from "./ExpandedPatch";
import { File } from "@/lib/files/types";
import { PatchOption } from "./PatchOption";
import { useCallback, useState } from "react";
import { useSubPatchLoader } from "@/hooks/useSubPatchLoader";
import { fetchOnchainSubPatch } from "@/lib/onchain/fetch";
import { usePatch } from "@/contexts/PatchContext";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { OperatorContextType } from "@/lib/nodes/context";
import { usePatches } from "@/contexts/PatchesContext";
import { SerializedPatch } from "@/lib/nodes/types";

const getType = (patch: SerializedPatch) => {
  if (patch.attributes?.type === "zen") {
    return OperatorContextType.ZEN;
  } else if (patch.attributes?.type === "gl") {
    return OperatorContextType.GL;
  } else if (patch.attributes?.type === "core") {
    return OperatorContextType.CORE;
  } else if (patch.attributes?.type === "audio") {
    return OperatorContextType.AUDIO;
  }
  return OperatorContextType.ZEN;
};

export const PatchesExplorer = () => {
  const { fetchSubPatchForDoc, onchainSubPatches } = useStorage();

  const [subpatches, setSubPatches] = useState(
    [...onchainSubPatches].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds),
  );
  const [tags, setTags] = useState(
    Array.from(new Set(subpatches.flatMap((x) => x.tags || []))).sort(),
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = subpatches.filter((x) => (selectedTag ? x.tags?.includes(selectedTag) : x));
  const [selectedPatch, setSelectedPatch] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const ret = usePatches();

  const openPatch = useCallback(async () => {
    if (selectedPatch && ret.selectedPatch) {
      setLoading(true);
      const serializedSubPatch = await fetchSubPatchForDoc(selectedPatch.id);
      if (serializedSubPatch) {
        let objectNode = new ObjectNodeImpl(ret.selectedPatch);
        objectNode.parse(selectedPatch.name, getType(serializedSubPatch), true, serializedSubPatch);
        objectNode.position = { x: 100, y: 100 };
        ret.selectedPatch.objectNodes.push(objectNode);
        ret.setCounter(Math.random());
        objectNode.subpatch?.initialLoadCompile();
        setLoading(false);
      }
    }
  }, [selectedPatch, ret.selectedPatch]);

  return (
    <div className="pt-10">
      <div className="flex gap-2 absolute top-0 w-full overflow-x-auto py-1">
        {tags.map((x) => (
          <Tag key={x} name={x} isSelected={selectedTag === x} setSelectedTag={setSelectedTag} />
        ))}
      </div>
      {selectedPatch ? (
        <ExpandedPatch
          loading={loading}
          setSelectedPatch={setSelectedPatch}
          openPatch={openPatch}
          patch={selectedPatch}
        />
      ) : (
        filtered.map((patch) => (
          <PatchOption setSelectedPatch={setSelectedPatch} key={patch.id} patch={patch} />
        ))
      )}
    </div>
  );
};

const Tag: React.FC<{
  name: string;
  isSelected: boolean;
  setSelectedTag: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({ name, isSelected, setSelectedTag }) => {
  let bg = isSelected ? "bg-zinc-300" : "bg-zinc-900";
  let fg = isSelected ? "text-zinc-900" : "text-zinc-100";
  let className = `px-4 py-1 rounded-full cursor-pointer transition-all ${bg} ${fg}`;
  return (
    <div
      onClick={() => (isSelected ? setSelectedTag(null) : setSelectedTag(name))}
      className={className}
    >
      {name}
    </div>
  );
};
