import { useCallback, useEffect, useState } from "react";
import PatchWindow from "./PatchWindow";
import { useWindows } from "@/contexts/WindowsContext";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Cross2Icon,
  TriangleDownIcon,
  TriangleUpIcon,
} from "@radix-ui/react-icons";
import ObjectNodeComponent from "./ObjectNodeComponent";
import { NodePatchWrapper } from "./NodePatchWrapper";

export const PatchWindows = () => {
  const [hide, setHide] = useState(false);
  const { patchWindows, sideNodeWindow } = useWindows();


  useEffect(() => {
    // setHide(false);
  }, [patchWindows]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "b" && e.metaKey) {
        setHide(!hide);
      }
    },
    [hide],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);
  if (patchWindows.length === 0) return <></>;
  const iconClass = "top-0 left-2 w-8 h-8 absolute cursor-pointer";
  return (
    <div
      style={{
        backgroundSize: "14px 14px",
        backgroundImage:
          "radial-gradient(circle at center center, rgba(41, 41, 41, 0.44) 0%, rgba(28, 27, 27, 0.08) 11%, transparent 11%, transparent 100%), linear-gradient(90deg, rgba(11, 11, 11, 0.69), rgba(11, 11, 11, 0.69))",
        zIndex: 10000000000,
      }}
      className="transition-all w-full relative pl-10 left-0 pt-2 flex gap-2 border-t border-t-2 border-t-zinc-800 bg-zinc-900 "
    >
      {hide ? (
        <TriangleUpIcon className={iconClass} onClick={() => setHide(!hide)} />
      ) : (
        <TriangleDownIcon onClick={() => setHide(!hide)} className={iconClass} />
      )}

      {!hide && sideNodeWindow && <NodePatchWrapper objectNode={sideNodeWindow} />}
      <div className="flex-1 left-0 overflow-x-auto whitespace-nowrap flex gap-2 ">
        {hide ? (
          <div className="w-full h-6"></div>
        ) : (
          patchWindows.map((patch) => <PatchWindow key={patch.id} patch={patch} />)
        )}
      </div>
    </div>
  );
};
