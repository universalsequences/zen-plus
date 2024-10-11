import { useValue } from "@/contexts/ValueContext";
import { usePosition } from "@/contexts/PositionContext";
import { XYControl } from "@/lib/nodes/definitions/core/xy";
import { Coordinate, ObjectNode } from "@/lib/nodes/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  objectNode: ObjectNode;
}

export const XYControlComponent = (props: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const { objectNode } = props;
  const { sizeIndex } = usePosition();
  let { width, height } = objectNode.size || { width: 50, height: 50 };

  const [dragging, setDragging] = useState<Coordinate | null>(null);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      if (!ref.current) return;

      const xy = objectNode.custom as XYControl;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const x_norm = x / ref.current.offsetWidth;
      const y_norm = 1 - y / ref.current.offsetHeight;

      dragging.x = Math.min(1, Math.max(0, x_norm));
      dragging.y = Math.min(1, Math.max(0, y_norm));
      objectNode.receive(objectNode.inlets[0], "bang");
    },
    [dragging, width, height],
  );

  const onMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(null);
    const xy = objectNode.custom as XYControl;
    xy.round();
  }, [dragging]);

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [onMouseUp, onMouseMove]);

  const fillColor = objectNode.attributes["fill-color"] as string;

  useValue();
  const points = (objectNode.custom as XYControl).points;
  const labels = (objectNode.attributes.labels as string).split(",");

  const minX = objectNode.attributes.minX as number;
  const maxX = objectNode.attributes.maxX as number;
  const widthX = maxX - minX;
  const minY = objectNode.attributes.minY as number;
  const maxY = objectNode.attributes.maxY as number;
  const widthY = maxY - minY;

  const roundX = objectNode.attributes.roundX as number;

  // Calculate grid lines
  const xGridLines = [];
  for (let i = 0; i <= widthX; i += roundX) {
    const x = ((i - minX) / widthX) * 100;
    xGridLines.push(x);
  }

  const yGridLines = [];
  for (let i = 0; i <= 16; i++) {
    const y = (i / 16) * 100;
    yGridLines.push(y);
  }

  return (
    <div ref={ref} style={{ width, height }} className="flex">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {xGridLines.map((x, i) => (
          <line
            key={`x-${i}`}
            x1={x}
            y1={0}
            x2={x}
            y2={100}
            stroke={i % 4 === 0 ? "#4f4f4f" : "#1f1f1f"}
            strokeWidth={0.5}
          />
        ))}
        {yGridLines.map((y, i) => (
          <line key={`y-${i}`} x1={0} y1={y} x2={100} y2={y} stroke="#4f4f4f" strokeWidth={0.5} />
        ))}
        {points.map((x, i) => (
          <g key={`point-${i}`}>
            <circle
              onMouseDown={() => setDragging(x)}
              cx={x.x * 100}
              cy={100 - x.y * 100}
              r={7}
              fill={fillColor}
              className="hover:fill-red-500"
            />
            {labels[i] && (
              <text
                className="pointer-events-none"
                fontSize={6}
                x={x.x * 100 - 2}
                y={100 - x.y * 100 + 2}
              >
                {labels[i]}{" "}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
