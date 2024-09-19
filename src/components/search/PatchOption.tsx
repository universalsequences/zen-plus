import { File } from "@/lib/files/types";

interface Props {
  patch: File;
  setSelectedPatch: React.Dispatch<React.SetStateAction<File | null>>;
}

const getColor = (x: string): string => {
  if (x === "sequencer") {
    return "text-teal-500";
  } else if (x === "generator") {
    return "text-lime-500";
  } else if (x === "fx") {
    return "text-yellow-500";
  }
  return "text-zinc-400";
};
export const PatchOption = (props: Props) => {
  return (
    <div
      onClick={() => props.setSelectedPatch(props.patch)}
      className="flex p-1 w-full cursor-pointer"
    >
      <div className="text-zinc-100">{props.patch.name}</div>
      <div className="flex text-400 ml-auto">
        {props.patch.tags?.map((tag) => (
          <div className="underline mx-1">{tag}</div>
        ))}
      </div>
      <div className={`flex ${getColor(props.patch.moduleType as string)} ml-3`}>
        <div className=" mx-1">{props.patch.moduleType}</div>
      </div>
    </div>
  );
};
