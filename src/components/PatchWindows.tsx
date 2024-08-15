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

export const PatchWindows = () => {
  const [hide, setHide] = useState(false);
  const { patchWindows } = useWindows();
  useEffect(() => {
    setHide(false);
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
      style={{ zIndex: 10000000000 }}
      className="w-full fixed bottom-0  pl-10 left-0 pt-2 bg-black flex gap-2 border-t border-t-2 border-t-zinc-800 bg-zinc-900 "
    >
      {hide ? (
        <TriangleUpIcon className={iconClass} onClick={() => setHide(!hide)} />
      ) : (
        <TriangleDownIcon onClick={() => setHide(!hide)} className={iconClass} />
      )}
      <div className="w-full left-0 overflow-x-auto whitespace-nowrap flex gap-2 ">
        {hide ? (
          <div className="w-full h-6"></div>
        ) : (
          patchWindows.map((patch) => <PatchWindow key={patch.id} patch={patch} />)
        )}
      </div>
    </div>
  );
};
