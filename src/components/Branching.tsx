import { Branching as BranchingContext } from "@/lib/nodes/vm/evaluate";
import { ActivityLogIcon, CircleBackslashIcon, ListBulletIcon } from "@radix-ui/react-icons";

export const Branching: React.FC<{ top: boolean; branching: BranchingContext }> = ({
  branching,
  top = true,
}) => {
  return (
    <div className={`relative flex flex-col ${top ? "my-2 border border-zinc-800 p-2" : ""}`}>
      {top && <ListBulletIcon className="w-4 h-4 absolute text-zinc-400 right-2 top-2" />}
      <div className="flex gap-2">branch: {branching.id}</div>
      <div className="pl-1 flex">
        {branching.parent && <Branching top={false} branching={branching.parent} />}
      </div>
    </div>
  );
};
