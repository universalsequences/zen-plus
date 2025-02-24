import React, { useRef, useEffect, useState } from "react";
import { ObjectNode, MessageObject } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";

const MatrixInnerCell: React.FC<{
  selectedField: string;
  min: number;
  ref1: React.RefObject<HTMLDivElement>;
  fillColor: string;
  max: number;
  cornerRadius: string;
  isFullRadius: boolean;
  showValue: boolean;
  unit: string;
  valueRef: React.MutableRefObject<number>;
  idx: number;
  isBar: boolean;
  objectNode: ObjectNode;
  isLine: boolean;
}> = ({
  objectNode,
  isLine,
  selectedField,
  idx,
  valueRef,
  isBar,
  unit,
  isFullRadius,
  cornerRadius,
  max,
  min,
  showValue,
  fillColor,
  ref1,
}) => {
  let [value, setValue] = useState(0);
  let { value: counter } = useValue();
  let ref2 = useRef<HTMLDivElement | null>(null);

  // Keep the main effect that updates value, but optimize its dependencies
  useEffect(() => {
    if (objectNode.buffer) {
      let _value =
        objectNode.attributes.type === "object" && objectNode.buffer[idx]
          ? ((objectNode.buffer as MessageObject[])[idx][selectedField] as number)
          : (objectNode.buffer[idx] as number);

      if (valueRef.current !== _value) {
        setValue(_value);
        valueRef.current = _value;
      }
    }
  }, [
    selectedField,
    objectNode.buffer,
    idx,
    // Include counter to ensure updates on value changes
    counter,
  ]);

  // Batch DOM updates for labels
  useEffect(() => {
    if (!showValue || !ref2.current) return;

    const labels = objectNode.attributes.options;
    if (labels) {
      const array = Array.isArray(labels)
        ? labels
        : typeof labels === "number"
          ? [labels]
          : (labels as string).split(",");
      ref2.current.innerText = array[value % array.length] as string;
    } else {
      ref2.current.innerText = `${max > 1 ? Math.round(value) : Math.round(100 * value) / 100} ${unit}`;
    }
  }, [showValue, value, max, unit, objectNode.attributes.options]);

  // Batch style updates
  useEffect(() => {
    if (!ref1.current) return;

    const percentage = ((value - min) / (max - min)) * 99 + "%";
    ref1.current.style.width = isBar
      ? "8%"
      : !isLine && !isBar && !isFullRadius
        ? "99%"
        : !isLine && isFullRadius
          ? percentage
          : " ";
    console.log("batch style update", ref1.current.style.width);
    if (isBar) {
      ref1.current.style.marginLeft = "auto";
      ref1.current.style.marginRight = "auto";
      ref1.current.style.left = "0";
      ref1.current.style.right = "0";
    } else {
      //ref1.current.style.marginLeft = "unset";
      //ref1.current.style.marginRight = "unset";
      ref1.current.style.left = "unset";
      ref1.current.style.right = "unset";
    }
    ref1.current.style.height = isBar ? percentage : isLine ? "2px" : percentage;
    ref1.current.style.bottom = isLine ? percentage : "0";
    ref1.current.style.backgroundColor = fillColor;
  }, [value, isLine, isBar, max, isFullRadius, fillColor, min]);

  return React.useMemo(
    () => (
      <>
        <div ref={ref1}>
          {isBar && (
            <div
              style={{
                width: "300%",
                left: "-92%",
                top: -1,
                backgroundColor: fillColor,
                aspectRatio: "1/1",
              }}
              className=" rounded-full table absolute mx-auto "
            />
          )}
        </div>
        <div className="table absolute h-full w-full flex top-0 left-0 active:opacity-100 opacity-0 hover:opacity-100">
          <div
            ref={ref2}
            style={{ fontSize: "60%" }}
            className="table absolute top-0 left-0 right-0 bottom-0 m-auto text-white"
          />
        </div>
      </>
    ),
    [fillColor, isBar],
  );
};

export default React.memo(MatrixInnerCell);
