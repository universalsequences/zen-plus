import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import type { Atom, Dot, Dash, ETPattern } from "@/lib/nodes/definitions/core/et-system/editor";
import { ObjectNode } from "@/lib/nodes/types";
import { useCallback, useEffect, useState } from "react";

export const ETEditor = ({ objectNode }: { objectNode: ObjectNode }) => {
  const [pattern, setPattern] = useState<ETPattern>([]);
  const [cursor, setCursor] = useState(0);
  const { selectedNodes } = useSelection();
  const { lockedMode } = useLocked();
  const [selectedSymbols, setSelectedSymbols] = useState<number[]>([]);
  usePosition();
  const size = objectNode.size || { width: 100, height: 100 };

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!lockedMode) {
        return;
      }
      console.log("on key down-=", e.key);
      if (!selectedNodes.includes(objectNode)) return;
      if (e.key === "o") {
        console.log("setting pattern");
        setPattern((prev) => [...prev.slice(0, cursor), 0, ...prev.slice(cursor)]);
        setCursor(Math.min(pattern.length, cursor + 2));
      } else if (e.key === "-") {
        setPattern((prev) => [...prev.slice(0, cursor), 1, ...prev.slice(cursor)]);
        setCursor(Math.min(pattern.length, cursor + 2));
      } else if (e.key === "Backspace") {
        if (selectedSymbols.length > 0) {
          const newPattern = pattern.filter((x, i) => !selectedSymbols.includes(i));
          setPattern(newPattern);
          setCursor(Math.min(cursor, newPattern.length - 1));
          setSelectedSymbols([]);
        } else {
          setPattern((prev) => [...prev.slice(0, cursor - 1), ...prev.slice(cursor)]);
          setCursor(Math.max(0, cursor - 1));
        }
      } else if (e.key === "ArrowLeft") {
        if (e.metaKey) {
          setSelectedSymbols((prev) => prev.slice(0, prev.length - 1));
        }
        setCursor(Math.max(0, cursor - 1));
      } else if (e.key === "ArrowRight") {
        if (e.metaKey) {
          setSelectedSymbols((prev) => [...prev, cursor]);
        }
        setCursor(Math.min(pattern.length, cursor + 1));
      }
    },
    [pattern, lockedMode, selectedNodes, selectedSymbols, cursor],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodes, lockedMode, pattern, cursor]);

  return (
    <div className="bg-black text-white w-full h-full flex gap-1 flex-wrap">
      {pattern.slice(0, cursor).map((atom, index) => (
        <Atom isSelected={selectedSymbols.includes(index)} atom={atom} />
      ))}
      <div className="w-0.5 h-4 animate-pulse bg-white" />
      {pattern.slice(cursor).map((atom, index) => (
        <Atom isSelected={selectedSymbols.includes(index + cursor)} atom={atom} />
      ))}
    </div>
  );
};

const Atom = ({ isSelected, atom }: { isSelected: boolean; atom: Atom }) => {
  if (atom === 0) {
    return (
      <div
        className={`w-4 h-4 border border-2 rounded-full  ${!isSelected ? "border-white" : "bg-white"}`}
      />
    );
  } else if (atom === 1) {
    return (
      <div
        className={`w-8 h-4 border border-2 rounded-full  ${!isSelected ? "border-white" : "bg-white"}`}
      />
    );
  }
  return <></>;
};
