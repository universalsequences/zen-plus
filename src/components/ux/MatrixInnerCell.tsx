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
  objectNode: ObjectNode;
  isLine: boolean;
}> = ({
  objectNode,
  isLine,
  selectedField,
  idx,
  valueRef,
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

  useEffect(() => {
    if (objectNode.buffer && valueRef.current !== objectNode.buffer[idx]) {
      let _value =
        objectNode.attributes.type === "object" && objectNode.buffer[idx]
          ? ((objectNode.buffer as MessageObject[])[idx][
              selectedField
            ] as number)
          : (objectNode.buffer[idx] as number);
      setValue(_value);
      valueRef.current = _value;
    }
  }, [
    selectedField,
    setValue,
    (objectNode.buffer as Float32Array | Uint8Array | MessageObject[])[idx],
  ]);

  useEffect(() => {
    if (showValue && ref2.current) {
      let labels = objectNode.attributes.options;
      if (labels) {
        if (showValue) {
          let array = Array.isArray(labels)
            ? labels
            : typeof labels === "number"
              ? [labels]
              : (labels as string).split(",");
          let label = array[value % array.length];
          ref2.current.innerText = label as string;
        }
      } else {
        ref2.current.innerText = `${showValue ? (max > 1 ? Math.round(value) : Math.round(100 * value) / 100) : ""} ${showValue ? unit : ""}`;
      }
    }
  }, [showValue, max, value]);

  useEffect(() => {
    let _value = ((value - min) / (max - min)) * 99 + "%";

    if (ref1.current) {
      ref1.current.style.width = !isLine && isFullRadius ? _value : " ";
      ref1.current.style.height = isLine ? "2px" : _value;
      ref1.current.style.bottom = isLine ? _value : "0";
      ref1.current.style.backgroundColor = fillColor;
    }
    //setStyle(style);
  }, [isLine, max, isFullRadius, value, fillColor, min]);

  return React.useMemo(() => {
    return (
      <>
        <div ref={ref1}></div>
        <div className="table absolute h-full w-full flex top-0 left-0 active:opacity-100 opacity-0 hover:opacity-100">
          <div
            ref={ref2}
            className="table absolute top-0 left-0 right-0 bottom-0 m-auto text-white "
          >
            {/*showValue ? text : ''*/}
          </div>
        </div>
      </>
    );
  }, []);
};

export default MatrixInnerCell;
