import React, { useEffect, useRef, useState, useCallback } from "react";
import { TargetIcon, TriangleRightIcon } from "@radix-ui/react-icons";
import { usePatchSelector } from "@/hooks/usePatchSelector";

const NumberBox: React.FC<{
  lockedModeRef: React.MutableRefObject<boolean>;
  isParameter?: boolean;
  className?: string;
  isSelected: boolean;
  min: number;
  max: number;
  value: number;
  setValue: (x: number, e?: MouseEvent) => void;
  round: boolean;
}> = ({ isParameter, className, lockedModeRef, value, setValue, round, min, max, isSelected }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const mouseRef = useRef<number>(0);
  const rounding = useRef<boolean>(true);
  const initValue = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Measure container dimensions for adaptive font sizing
  useEffect(() => {
    if (ref.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === ref.current) {
            setContainerSize({
              width: entry.contentRect.width,
              height: entry.contentRect.height,
            });
          }
        }
      });

      resizeObserver.observe(ref.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Calculate font size based on container dimensions
  const getFontSize = () => {
    // Calculate size based on both height and width
    const { width, height } = containerSize;

    // First, calculate height-based font size with more aggressive scaling
    let heightBasedSize;
    if (height < 15) {
      heightBasedSize = 8;
    } else if (height < 20) {
      heightBasedSize = 10;
    } else if (height < 30) {
      heightBasedSize = 12;
    } else if (height < 40) {
      heightBasedSize = 14;
    } else if (height < 55) {
      heightBasedSize = 18;
    } else if (height < 70) {
      heightBasedSize = 22;
    } else if (height < 90) {
      heightBasedSize = 26;
    } else if (height < 120) {
      heightBasedSize = 32;
    } else {
      // For extremely tall components
      heightBasedSize = Math.min(50, Math.floor(height * 0.3)); // 30% of height, max 50px
    }

    // Calculate width-based size
    let widthBasedSize;
    if (width < 60) {
      widthBasedSize = 8;
    } else if (width < 90) {
      widthBasedSize = 10;
    } else if (width < 130) {
      widthBasedSize = 12;
    } else if (width < 180) {
      widthBasedSize = 14;
    } else if (width < 220) {
      widthBasedSize = 16;
    } else if (width < 280) {
      widthBasedSize = 18;
    } else {
      widthBasedSize = 20;
    }

    // Use the smaller of the two sizes to ensure text fits in both dimensions
    // With a slight bias toward the height-based size
    const finalSize = Math.min(heightBasedSize, widthBasedSize * 1.3);
    return `${finalSize}px`;
  };

  // Use a constant size for the triangle icon
  const getIconSize = () => {
    return "12px"; // Fixed size for consistency
  };

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousedown", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [setEditing, editing, setValue, min, max]);

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!keyMode.current) {
        setEditing(false);
      }
      keyMode.current = false;
    },
    [setEditing],
  );

  const keyMode = useRef(false);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!editing || keyMode.current) {
        return;
      }

      const mouseY = e.pageY;
      const windowHeight = window.innerHeight;
      const mouseDelta = mouseY - mouseRef.current;

      // Calculate distances to screen edges from initial mouse position
      const distanceToTop = mouseRef.current;
      const distanceToBottom = windowHeight - mouseRef.current;

      let newValue;
      if (mouseDelta > 0) {
        // Moving down - map from initValue to min
        const percentageToBottom = Math.min(1, mouseDelta / distanceToBottom);
        newValue = initValue.current - (initValue.current - min) * percentageToBottom;
      } else {
        // Moving up - map from initValue to max
        const percentageToTop = Math.min(1, -mouseDelta / distanceToTop);
        newValue = initValue.current + (max - initValue.current) * percentageToTop;
      }

      // Apply rounding if enabled
      if (rounding.current) {
        const distanceFromOriginal = Math.abs(mouseDelta);
        const roundingFactor = distanceFromOriginal < 50 ? 100 : 1;
        newValue = Math.round(newValue); // * roundingFactor) / roundingFactor;
      }

      // Clamp to min/max
      newValue = Math.max(min, Math.min(newValue, max));
      setValue(newValue, e);
    },
    [editing, setValue, min, max],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (editing && keyMode.current) {
        if (e.key === "Enter") {
          const newValue = Number(typedValue);
          if (!Number.isNaN(newValue)) {
            const clampedValue = Math.max(min, Math.min(newValue, max));
            setValue(clampedValue);
          }
          setEditing(false);
          setTypedValue("");
          keyMode.current = false;
        } else if (e.key === "Escape") {
          setEditing(false);
          setTypedValue("");
          keyMode.current = false;
        }
      }
    },
    [editing, setValue, typedValue, min, max],
  );

  const { selectPatch } = usePatchSelector();
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  let integer: string | number = Math.trunc(value);
  let float = value - Math.trunc(value);
  float = Math.round(float * 1000) / 1000;
  if (value < 0 && value > -1) {
    integer = "-0";
  }

  const startEditing = (e: React.MouseEvent) => {
    selectPatch();
    if (!lockedModeRef.current) {
      return;
    }
    e.stopPropagation();
    setEditing(true);
    mouseRef.current = e.pageY;
    initValue.current = value;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    keyMode.current = true;
    setTypedValue((Math.round(value * 1000) / 1000).toString());
    setEditing(true);
    e.stopPropagation();
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // Determine styling based on container size
  const fontSize = getFontSize();
  const iconSize = getIconSize();

  // Always show icon unless width is extremely constrained
  const showIcon = true;

  // Only use compact display for extremely constrained width
  // For standard height=20 elements, keep the decimal editor visible
  const useCompactDisplay = containerSize.width < 40;

  return (
    <div ref={ref} className="w-full h-full">
      <div
        className={`${className ? className : "m-y"} bg-zinc-800 h-full flex flex-1 active:bg-zinc-700 ${keyMode.current ? "cursor-text" : "cursor-ns-resize"}`}
        style={{
          fontSize: fontSize,
          display: "flex",
          alignItems: "center",
        }}
      >
        {showIcon && (
          <TriangleRightIcon
            onMouseDown={startEditing}
            className="mr-1 my-auto invert active:fill-red-500"
            style={{ width: iconSize, height: iconSize, minWidth: iconSize }}
          />
        )}
        <div
          onMouseDown={startEditing}
          onDoubleClick={handleDoubleClick}
          className="flex-1 active:text-green-200 text-white my-auto flex overflow-hidden"
          style={{ maxHeight: "100%" }}
        >
          {keyMode.current && editing ? (
            <input
              ref={inputRef}
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              className="bg-transparent outline-none w-full"
              style={{ fontSize: fontSize }}
              onBlur={() => {
                setEditing(false);
                setTypedValue("");
              }}
            />
          ) : useCompactDisplay ? (
            // Compact display for very small widths - just the integer part or rounded value
            <div className="w-full truncate">
              {Number.isInteger(value) ? value : Math.round(value * 10) / 10}
            </div>
          ) : (
            // Normal display with integer and decimal parts
            <>
              <div
                onMouseDown={() => (rounding.current = true)}
                className="truncate"
                style={{ maxWidth: "40%" }}
              >
                {integer}
              </div>
              <div className="mx-px">.</div>
              <div onMouseDown={() => (rounding.current = false)} className="flex-1 truncate">
                {float !== undefined
                  ? value < 0
                    ? float.toString().slice(3)
                    : float.toString().slice(2)
                  : ""}
              </div>
            </>
          )}
          {isParameter && <TargetIcon className="mr-1 w-2 h-2 my-auto" />}
        </div>
      </div>
    </div>
  );
};

export default NumberBox;
