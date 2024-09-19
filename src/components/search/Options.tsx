import { CubeIcon, FileIcon } from "@radix-ui/react-icons";

export enum SearchOption {
  Objects = 0,
  Files = 1,
  Patches = 2,
}

interface Props {
  option: SearchOption;
  setOption: React.Dispatch<React.SetStateAction<SearchOption>>;
}
export const Options = ({ setOption, option }: Props) => {
  return (
    <div className="flex mb-2">
      <div
        onClick={() => setOption(SearchOption.Objects)}
        className={
          (option === SearchOption.Objects ? "border-zinc-300" : "border-zinc-900") +
          " mr-2 px-2 py-2 border cursor-pointer bg-zinc-800 rounded-md flex cursor-pointer"
        }
      >
        <CubeIcon className="w-4 h-4 mr-2" /> objects
      </div>
      <div
        onClick={() => setOption(SearchOption.Files)}
        className={
          (option === SearchOption.Files ? "border-zinc-300" : "border-zinc-900") +
          " mr-2 px-2 py-2 border cursor-pointer bg-zinc-800 rounded-md flex cursor-pointer"
        }
      >
        <FileIcon className="w-4 h-4 mr-2" /> files
      </div>
      <div
        onClick={() => setOption(SearchOption.Patches)}
        className={
          (option === SearchOption.Patches ? "border-zinc-300" : "border-zinc-900") +
          " mr-2 px-2 py-2 border cursor-pointer bg-zinc-800 rounded-md flex cursor-pointer"
        }
      >
        <FileIcon className="w-4 h-4 mr-2" /> patches
      </div>
    </div>
  );
};
