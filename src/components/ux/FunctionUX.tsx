import React, { useCallback, useRef, useState, useEffect } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useMessage } from "@/contexts/MessageContext";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";
import { ObjectNode } from "@/lib/nodes/types";
import { Point, FunctionEditor } from "@/lib/nodes/definitions/core/function";
import { usePatchSelector } from "@/hooks/usePatchSelector";

const FunctionUX: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let ref = useRef<SVGSVGElement | null>(null);
  const { sizeIndex } = usePosition();
  const { selectPatch } = usePatchSelector();
  let { width, height } = sizeIndex[objectNode.id] || {
    width: 300,
    height: 80,
  };
  let editor: FunctionEditor = objectNode.custom as any as FunctionEditor;
  let [points, setPoints] = useState(editor.points);
  useSelection();
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
      let y = e.clientY - rect.top - 10;
      let x = e.clientX - rect.left - 10;

      const svgPoint = ref.current.createSVGPoint();
      svgPoint.x = e.clientX;
      svgPoint.y = e.clientY;
      const mousePosition = svgPoint.matrixTransform(ref.current.getScreenCTM()?.inverse());
      x = mousePosition.x;
      y = mousePosition.y;

      if (editor.adsr) {
        return;
      }
      if (x < 0 || y < 0 || x > width || y > height) {
        return;
      }

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

      const svgPoint = ref.current.createSVGPoint();
      svgPoint.x = e.clientX;
      svgPoint.y = e.clientY;
      const mousePosition = svgPoint.matrixTransform(ref.current.getScreenCTM()?.inverse());
      x = mousePosition.x;
      y = mousePosition.y;

      x = Math.min(x, width);
      y = Math.min(y, height);
      x = Math.max(x, 0);
      y = Math.max(y, 0);

      x = 1000 * (x / width);
      y = 1 - y / height;
      y = Math.min(1, Math.max(0, y));
      x = Math.min(1000, Math.max(0, x));

      if (editing) {
        if (editor.adsr) {
          const index = editor.points.indexOf(editing);
          if (index === 2 || index === 3) {
            editor.points[2].y = y;
            editor.points[3].y = y;
            editing.x = x;
          } else if (index === 4) {
            return;
          } else {
            editing.x = x;
            editing.y = y;
          }

          editing.x = Math.min(editing.x, editor.points[index + 1]?.x);
          if (index >= 1) {
            editing.x = Math.max(editing.x, editor.points[index - 1]?.x);
          }
        } else {
          editing.x = x;
          editing.y = y;
        }
        setPoints([...editor.points]);
      } else if (curveEdit) {
        if (editor.adsr && editor.points.indexOf(curveEdit) === 2) {
          editor.points[2].y = y;
          editor.points[3].y = y;
          setPoints([...editor.points]);
        } else {
          curveEdit.c = -1 + y * 2;
          if (Math.abs(curveEdit.c) < 0.05) {
            curveEdit.c = 0;
          }
          setPoints([...editor.points]);
        }
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
        className={curveEdit ? "cursor-ns-resize flex relative" : "flex relative"}
        style={{ width, height: height }}
      >
        <div className="pointer-events-none z-30 absolute right-0 bottom-0 text-white">
          {editing ? `x=${round(editing.x / 1000.0)} y=${round(editing.y)}` : ""}
          {curveEdit ? `c=${Math.round(100 * curveEdit.c!) / 100.0}` : ""}
        </div>
        <svg
          className="m-auto"
          viewBox={`-10 -10 ${width + 10} ${height + 20}`}
          ref={ref}
          width={width}
          height={height}
        >
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
            <g key={i} className="transitioncolors active:stroke-red-500 hover:stroke-red-500">
              <path
                onMouseDown={(e: any) => {
                  selectPatch();
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
                  selectPatch();
                  if (lockedMode) {
                    e.stopPropagation();
                    setCurveEdit(sortedPoints[i]);
                  }
                }}
                stroke="#00fff4"
                fill="transparent"
                className="transition-colors active:stroke-red-500 hover:stroke-red-500 cursor-ns-resize"
                d={d}
                strokeWidth={2}
              />
            </g>
          ))}
          {points.map((point, i) => (
            <g key={i} className="hover:stroke-white hover:fill-black transition-colors">
              <rect
                onMouseDown={(e: any) => {
                  selectPatch();
                  e.stopPropagation();
                  if (!lockedMode) {
                    return;
                  }
                  setEditing(point);
                }}
                x={-2 + (width * point.x) / 1000}
                y={-4 + (1.0 - point.y) * height}
                width={6}
                height={6}
                className="cursor-pointer stroke-yellow-500 "
              />
              <rect
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  selectPatch();
                  if (!lockedMode) {
                    return;
                  }
                  setEditing(point);
                }}
                className="cursor-pointer"
                x={-4 + (width * point.x) / 1000}
                y={-4 + (1.0 - point.y) * height}
                width={12}
                height={12}
                fill={"transparent"}
              />
            </g>
          ))}
        </svg>
      </div>
    );
  }, [divisions, width, height, lockedMode, points, setCurveEdit, editing, curveEdit]);
};
export default FunctionUX;

const round = (r: number) => Math.round(100 * r) / 100.0;
