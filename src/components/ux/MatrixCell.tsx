import React, { useEffect, useState, useRef, useCallback } from "react";
import MatrixInnerCell from "./MatrixInnerCell";
import { Position } from "./Matrix";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";

const MatrixCell: React.FC<{
  selectedField: string;
  min: number;
  unit: string;
  isDisabled: boolean;
  showValue: boolean;
  ux: string;
  fillColor: string;
  max: number;
  cornerRadius: string;
  width: number;
  height: number;
  toggle: (row: number, col: number, value?: number) => void;
  type: string;
  lockedMode: boolean;
  objectNode: ObjectNode;
  idx: number;
  _idx: number;
  row: number;
  col: number;
  editing: React.MutableRefObject<Position | null>;
}> = ({
  idx,
  row,
  col,
  selectedField,
  editing,
  objectNode,
  isDisabled,
  unit,
  lockedMode,
  showValue,
  type,
  toggle,
  cornerRadius,
  width,
  height,
  max,
  fillColor,
  ux,
  min,
  _idx,
}) => {
  let [isSelected, setIsSelected] = useState<boolean>(false);
  useValue();

  useEffect(() => {
    if (objectNode.saveData !== undefined) {
      setIsSelected((objectNode.saveData as number) === _idx);
    }
  }, [objectNode.saveData, setIsSelected, _idx]);

  let valueRef = useRef(0);
  let ref = useRef<HTMLDivElement>(null);
  let ref1 = useRef<HTMLDivElement>(null);
  let isLine = ux === "line";
  let isFullRadius = cornerRadius === "full";
  useEffect(() => {
    if (ref1.current) {
      ref1.current.className = `${isLine ? "absolute w-full" : isFullRadius ? "m-auto" : "absolute bottom-0 w-full"} rounded-${cornerRadius}`;
    }
  }, [isLine, isFullRadius, cornerRadius]);

  return React.useMemo(() => {
    return (
      <div
        ref={ref}
        onMouseDown={(e: any) => {
          if (!lockedMode) {
          } else {
            e.stopPropagation();
            if (
              !objectNode.attributes.toggle &&
              (type === "float" || type === "uint8" || type === "object")
            ) {
              let rect = ref.current?.getBoundingClientRect();
              let startY = e.clientY - rect!.top;
              editing.current = {
                x: col,
                y: row,
                value: valueRef.current,
                startY,
              };
            } else {
              toggle(row, col);
            }
          }
        }}
        onMouseOver={(e: any) => {
          if (
            editing.current &&
            (editing.current.x !== col || editing.current.y !== row)
          ) {
            if (
              !objectNode.attributes.toggle &&
              (type === "float" || type === "uint8" || type === "object")
            ) {
              let rect = ref.current?.getBoundingClientRect();
              let startY = e.clientY - rect!.top;
              if (editing.current.y === row) {
                //startY = editing.current.startY;
                let val = max * ((height - startY) / height);
                toggle(row, col, val);
                valueRef.current = val;
              }
              editing.current = {
                x: col,
                y: row,
                value: valueRef.current,
                startY,
              };
            }
          }
        }}
        onClick={(e: any) => {
          if (lockedMode) {
            e.stopPropagation();
          }
        }}
        style={{
          backgroundColor: isSelected ? "#fafafa42" : "",
          borderColor: isSelected ? "white" : "",
          width: width,
          minWidth: 10,
          minHeight: 10,
          margin: "2px",
          height: height,
        }}
        className={`${isDisabled ? "opacity-10 pointer-events-none" : ""} relative flex rounded-${cornerRadius} overflow-hidden border bg-black-clear2 border-zinc-800 cursor-pointer active:bg-zinc-800 active:border-zinc-100 `}
      >
        <MatrixInnerCell
          ref1={ref1}
          min={min}
          objectNode={objectNode}
          selectedField={selectedField}
          isLine={ux === "line"}
          idx={idx}
          valueRef={valueRef}
          unit={unit}
          isFullRadius={cornerRadius === "full"}
          cornerRadius={cornerRadius}
          max={max}
          showValue={showValue}
          fillColor={fillColor}
        />
      </div>
    );
  }, [
    selectedField,
    isSelected,
    width,
    height,
    isDisabled,
    fillColor,
    showValue,
    max,
    cornerRadius,
    lockedMode,
    ux,
    unit,
    min,
  ]);
};

export default MatrixCell;
