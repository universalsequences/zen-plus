import { useStorage } from "@/contexts/StorageContext";
import { ExpandedPatch } from "./ExpandedPatch";
import { File } from "@/lib/files/types";
import { PatchOption } from "./PatchOption";
import { useCallback, useEffect, useState } from "react";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import { OperatorContextType } from "@/lib/nodes/context";
import { usePatches } from "@/contexts/PatchesContext";
import { SerializedPatch } from "@/lib/nodes/types";

export const getSubPatchType = (patch: SerializedPatch) => {
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

interface Props {
  text: string;
}
export const PatchesExplorer = ({ text }: Props) => {
  const { fetchSubPatchForDoc, onchainSubPatches } = useStorage();

  const [subpatches, setSubPatches] = useState(
    [...onchainSubPatches].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds),
  );
  const [tags, setTags] = useState(
    Array.from(new Set(subpatches.flatMap((x) => x.tags || []))).sort(),
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filtered = subpatches
    .filter((x) => text === "" || x.name.toLowerCase().includes(text.toLowerCase()))
    .filter((x) => (selectedTag ? x.tags?.includes(selectedTag) : x));
  const [selectedPatch, setSelectedPatch] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const ret = usePatches();

  const openPatch = useCallback(async () => {
    if (selectedPatch && ret.selectedPatch) {
      setLoading(true);
      const serializedSubPatch = await fetchSubPatchForDoc(selectedPatch.id);
      if (serializedSubPatch) {
        const objectNode = new ObjectNodeImpl(ret.selectedPatch);
        objectNode.parse("zen", getSubPatchType(serializedSubPatch), true, serializedSubPatch);
        objectNode.position = { x: 100, y: 100 };
        ret.selectedPatch.objectNodes.push(objectNode);
        ret.setCounter(Math.random());
        objectNode.subpatch?.initialLoadCompile(false);
        setLoading(false);
      }
    }
  }, [selectedPatch, ret.selectedPatch]);

  useEffect(() => {
    setSelectedPatch(null);
  }, [selectedTag]);

  return (
    <div className="pt-10">
      <div className="flex gap-2 absolute top-0 w-full ">
        <div>
          {selectedTag && (
            <Tag name={selectedTag} isSelected={true} setSelectedTag={setSelectedTag} />
          )}
        </div>
        <div className="flex-1 overflow-x-auto py-1 no-scrollbar flex gap-2">
          {tags
            .filter((x) => x !== selectedTag)
            .map((x) => (
              <Tag
                key={x}
                name={x}
                isSelected={selectedTag === x}
                setSelectedTag={setSelectedTag}
              />
            ))}
        </div>
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
  const bg = isSelected ? "bg-zinc-300" : "bg-zinc-900";
  const fg = isSelected ? "text-zinc-900" : "text-zinc-100";
  const className = `px-4 py-1 rounded-full cursor-pointer transition-all whitespace-nowrap ${bg} ${fg}`;
  return (
    <div
      onClick={() => (isSelected ? setSelectedTag(null) : setSelectedTag(name))}
      className={className}
    >
      {name}
    </div>
  );
};
