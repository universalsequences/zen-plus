import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { ValueProvider } from "@/contexts/ValueContext";
import * as mat from "@/lib/nodes/definitions/core/matrix";
import MatrixCell from "./MatrixCell";
import { useMessage } from "@/contexts/MessageContext";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";
import { MessageObject, ObjectNode } from "@/lib/nodes/types";

export interface Position {
  x: number;
  y: number;
  value: number;
  startY: number;
}
const Matrix: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let attributes = objectNode.attributes;
  let { attributesIndex } = useSelection();
  let editing = useRef<Position | null>(null);
  let ref = useRef<HTMLDivElement>(null);
  let {
    unit,
    showValue,
    disabledColumns,
    min,
    max,
    fillColor,
    cornerRadius,
    type,
    rows,
    columns,
    selectedField,
    pageSize,
    pageStart,
  } = attributes;

  const toggle = useCallback(
    (row: number, col: number, value?: number) => {
      let idx = row * (columns as number) + col;
      if (objectNode.buffer) {
        let oldValue =
          objectNode.attributes.type === "object"
            ? (objectNode.buffer[idx] as MessageObject)[selectedField as string]
            : objectNode.buffer[idx];
        let val = value !== undefined ? value : oldValue ? 0 : 1;
        objectNode.receive(objectNode.inlets[0], [col, row, val]);
      }
    },
    [columns, rows, selectedField],
  );

  const { sizeIndex } = usePosition();
  const { lockedMode } = useLocked();
  let { width, height } = objectNode.size || { width: 100, height: 100 };
  let size = objectNode.size || { width: 100, height: 100 };
  let cols = Math.min(columns as number, pageSize as number);
  let size_x = (width - cols * 4) / cols;
  let size_y = (height - (rows as number) * 4) / (rows as number);

  //   useEffect(() => {
  //        console.log('size index of matrix=', sizeIndex[objectNode.id], sizeIndex);
  //  }, [sizeIndex[objectNode.id]]);

  let { rowToShow, show } = objectNode.attributes;

  if (show === "row") {
    size_y = height;
  }

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [editing, size, rows, max, show]);

  const onMouseUp = useCallback(() => {
    editing.current = null;
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current || !editing.current) {
        return;
      }
      if (!size) {
        return;
      }
      let rect = ref.current.getBoundingClientRect();
      let height = 0 + size.height / (rows as number);
      if (show === "row") {
        height = size.height;
      }
      let client = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - (show === "row" ? 0 : editing.current.y) * height, // - (editing.current.startY)
      };
      let DIFF = editing.current.startY - client.y;
      let v =
        editing.current.value +
        ((min as number) + ((max as number) - (min as number)) * DIFF) / editing.current.startY;
      if (DIFF < 0) {
        v =
          editing.current.value +
          ((min as number) + ((max as number) - (min as number)) * DIFF) /
            (height - editing.current.startY);
      }
      let value = Math.min(max as number, v);
      if (value < (min as number)) {
        value = min as number;
      }
      if (isNaN(value)) {
        value = 0;
      }

      if (objectNode.attributes["round"]) {
        value = Math.round(value);
      }
      toggle(editing.current.y, editing.current.x, value);
      if (objectNode.custom) {
        (objectNode.custom as any as mat.Matrix).update();
      }
    },
    [editing, columns, size, max, min, show],
  );

  let ux = objectNode.attributes["ux"];

  let memo = React.useMemo(() => {
    let _rows = [];
    for (let i = 0; i < (rows as number); i++) {
      let row = [];
      for (let j = 0; j < (columns as number); j++) {
        row.push(0);
      }
      _rows.push(row);
    }
    let disabled: number[] =
      disabledColumns === undefined
        ? []
        : Array.isArray(disabledColumns)
          ? (disabledColumns as number[])
          : typeof disabledColumns === "number"
            ? [disabledColumns]
            : (disabledColumns as string)
                .split(",")
                .filter((x) => x !== "")
                .map((x) => parseInt(x));

    return (
      <div ref={ref} className="flex flex-col">
        {(show === "row" ? _rows.slice(rowToShow as number, (rowToShow as number) + 1) : _rows).map(
          (row, rowIndex) => (
            <div key={rowIndex + (rowToShow as number)} className="flex">
              {row.map((_value, index) =>
                !(
                  index >= (pageStart as number) &&
                  index < (pageStart as number) + (pageSize as number)
                ) ? (
                  <></>
                ) : (
                  <MatrixCell
                    cornerRadius={cornerRadius as string}
                    fillColor={fillColor as string}
                    row={rowIndex + (rowToShow as number)}
                    col={index}
                    idx={index + (rowIndex + (rowToShow as number)) * (columns as number)}
                    _idx={index + rowIndex * (columns as number)}
                    toggle={toggle}
                    width={size_x}
                    isDisabled={disabled.includes(index as number)}
                    selectedField={selectedField as string}
                    height={size_y}
                    showValue={showValue as boolean}
                    lockedMode={lockedMode}
                    unit={unit as string}
                    objectNode={objectNode}
                    ux={ux as string}
                    type={type as string}
                    editing={editing}
                    min={min as number}
                    max={objectNode.attributes["max"] as number}
                    key={index}
                  />
                ),
              )}
            </div>
          ),
        )}
      </div>
    );
  }, [
    disabledColumns,
    objectNode,
    size_x,
    size_y,
    selectedField,
    rowToShow,
    show,
    min,
    unit,
    rows,
    columns,
    type,
    fillColor,
    editing,
    lockedMode,
    toggle,
    ux,
    showValue,
    cornerRadius,
    pageSize,
    pageStart,
  ]);
  return memo;
};

export default Matrix;
