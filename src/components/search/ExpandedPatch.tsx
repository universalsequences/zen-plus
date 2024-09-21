import { File } from "@/lib/files/types";
import { PatchOption } from "./PatchOption";
import { ArrowLeftIcon, Cross2Icon, PlusCircledIcon } from "@radix-ui/react-icons";
import { PatchDocComponent } from "../org/PatchDocComponent";
import { PatchDoc } from "@/lib/org/types";

interface Props {
  patch: File;
  setSelectedPatch: React.Dispatch<React.SetStateAction<File | null>>;
  openPatch: () => void;
  loading: boolean;
}

export const ExpandedPatch = (props: Props) => {
  const { patch } = props;
  return (
    <div className="px-8  pt-5 flex flex-col gap-2 items-start relative border-t border-t-zinc-500 ">
      <ArrowLeftIcon
        onClick={() => props.setSelectedPatch(null)}
        className="absolute top-2 left-2 h-5 w-5 cursor-pointer"
      />
      <PatchOption patch={props.patch} setSelectedPatch={props.setSelectedPatch} />
      <div className="flex items-start">
        <button
          disabled={props.loading}
          onClick={props.openPatch}
          className="cursor-pointer  mt-1 mr-5 bg-zinc-300 text-zinc-900 px-2 flex py-1 rounded-lg"
        >
          <PlusCircledIcon className="my-auto mr-2" /> {props.loading ? "... loading" : "open"}
        </button>
        <div className="w-32">
          <PatchDocComponent doc={patch as PatchDoc} docId={patch.id} />
        </div>
      </div>
    </div>
  );
};
