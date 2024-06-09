import React, { useCallback, useRef, useState, useEffect } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useMessage } from "@/contexts/MessageContext";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { Point, FunctionEditor } from "@/lib/nodes/definitions/core/function";

const FunctionUX: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let ref = useRef<SVGSVGElement | null>(null);
  const { sizeIndex } = usePosition();
  let { width, height } = sizeIndex[objectNode.id] || {
    width: 300,
    height: 80,
  };
  let editor: FunctionEditor = objectNode.custom as any as FunctionEditor;
  let [points, setPoints] = useState(editor.points);
  let { attributesIndex } = useSelection();
  let { lockedMode } = useLocked();

  let { messages } = useMessage();
  let message = messages[objectNode.id];
  useEffect(() => {
    if (message !== undefined) {
      setPoints([...editor.points]);
    }
  }, [message, setPoints]);

  useEffect(() => {}, []);

  let [curveEdit, setCurveEdit] = useState<Point | null>(null);

  let [editing, setEditing] = useState<Point | null>(null);
  const onClick = useCallback(
    (e: any) => {
      if (!ref.current) {
        return;
      }
      let rect = ref.current.getBoundingClientRect();
      let y = e.clientY - rect.top;
      let x = e.clientX - rect.left;

      x = 1000 * (x / width);
      y = 1 - y / height;

      editor.addBreakPoint({ x, y });
      let point = editor.points[editor.points.length - 1];
      setPoints([...editor.points]);
      setEditing(point);
    },
    [setPoints, setEditing, width, height],
  );

  let paths = editor.toSVGPaths(width, height);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [editing, setPoints, setCurveEdit, curveEdit, width, height]);

  const onKeyDown = useCallback(
    (e: any) => {
      if (editing) {
        let key = e.key;
        if (key === "Backspace") {
          editor.points = editor.points.filter((x) => x !== editing);
          setEditing(null);
          setPoints([...editor.points]);
        }
      }
    },
    [setPoints, editing],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current || (!editing && !curveEdit)) {
        return;
      }
      const rect = ref.current.getBoundingClientRect();
      let y = e.clientY - rect.top;
      let x = e.clientX - rect.left;
      x = 1000 * (x / width);
      y = 1 - y / height;
      y = Math.min(1, Math.max(0, y));
      x = Math.min(1000, Math.max(0, x));

      if (editing) {
        editing.x = x;
        editing.y = y;
        setPoints([...editor.points]);
      } else if (curveEdit) {
        curveEdit.c = -1 + y * 2;
        if (Math.abs(curveEdit.c) < 0.05) {
          curveEdit.c = 0;
        }
        setPoints([...editor.points]);
      }
      objectNode.receive(objectNode.inlets[0], "bang");
    },
    [setPoints, editing, curveEdit, editor.points],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      setEditing(null);
      setCurveEdit(null);
      objectNode.receive(objectNode.inlets[0], "bang");
      editor.update();
    },
    [setEditing, setCurveEdit, width, height, editor],
  );

  let sortedPoints = [...points].sort((a, b) => a.x - b.x);

  const divisions = (objectNode.attributes.divisions as number) || 4;

  return React.useMemo(() => {
    return (
      <div
        onMouseDown={(e: any) => {
          if (lockedMode) {
            e.stopPropagation();
            onClick(e);
          }
        }}
        className={
          curveEdit ? "cursor-ns-resize flex relative" : "flex relative"
        }
        style={{ width, height: height }}
      >
        <div className="pointer-events-none z-30 absolute right-0 bottom-0 text-white">
          {editing
            ? `x=${round(editing.x / 1000.0)} y=${round(editing.y)}`
            : ""}
          {curveEdit ? `c=${Math.round(100 * curveEdit.c!) / 100.0}` : ""}
        </div>
        <svg ref={ref} className="my-auto " width={width} height={height}>
          {new Array(divisions + 1).fill(0).map((_a, i) => (
            <line
              key={i}
              x1={(width * i) / divisions}
              y1={0}
              x2={(width * i) / divisions}
              y2={height}
              stroke="#2f2f2f"
            />
          ))}
          {new Array(divisions + 1).fill(0).map((_a, i) => (
            <line
              key={i}
              y1={(height * i) / divisions}
              x1={0}
              y2={(height * i) / divisions}
              x2={width}
              stroke="#2f2f2f"
            />
          ))}
          {paths.map((d, i) => (
            <g
              key={i}
              className="transitioncolors active:stroke-red-500 hover:stroke-red-500"
            >
              <path
                onMouseDown={(e: any) => {
                  if (lockedMode) {
                    e.stopPropagation();
                    setCurveEdit(sortedPoints[i]);
                  }
                }}
                fill="transparent"
                className="cursor-ns-resize hover:stroke-red stroke-blue"
                d={d}
                stroke="transparent"
                strokeWidth={8}
              />
              <path
                onMouseDown={(e: any) => {
                  if (lockedMode) {
                    e.stopPropagation();
                    setCurveEdit(sortedPoints[i]);
                  }
                }}
                fill="transparent"
                className="transition-colors active:stroke-red-500 hover:stroke-red-500 stroke-zinc-400 cursor-ns-resize"
                d={d}
                strokeWidth={2}
              />
            </g>
          ))}
          {points.map((point, i) => (
            <g key={i} className="hover:fill-red-500 transition-colors">
              <circle
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  if (!lockedMode) {
                    return;
                  }
                  setEditing(point);
                }}
                className="cursor-pointer"
                cx={3 + (width * point.x) / 1000}
                cy={(1.0 - point.y) * height}
                r={6}
                fill={"transparent"}
              />
              <circle
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  if (!lockedMode) {
                    return;
                  }
                  setEditing(point);
                }}
                cx={(width * point.x) / 1000}
                cy={(1.0 - point.y) * height}
                r={4}
                className="cursor-pointer fill-white hover:fill-red-500"
              />
            </g>
          ))}
        </svg>
      </div>
    );
  }, [
    divisions,
    width,
    height,
    lockedMode,
    points,
    setCurveEdit,
    editing,
    curveEdit,
  ]);
};
export default FunctionUX;

const round = (r: number) => Math.round(100 * r) / 100.0;
