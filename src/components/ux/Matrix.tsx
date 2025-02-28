import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocked } from "@/contexts/LockedContext";
import { useValue } from "@/contexts/ValueContext";
import * as mat from "@/lib/nodes/definitions/core/matrix";
import { useSelection } from "@/contexts/SelectionContext";
import { usePosition } from "@/contexts/PositionContext";
import { MessageObject, ObjectNode } from "@/lib/nodes/types";

export interface Position {
  x: number;
  y: number;
  value: number;
  startY: number;
  rowOffset: number;
  cellHeight: number;
  // Relative position within cell (0-1)
  relativePosition: number;
  // Keep track of the previous value
  lastSetValue: number;
  // Keep track of the precise unrounded value for calculations (only used in rounded mode)
  preciseValue: number;
  // Last mouse Y position
  lastMouseY: number;
}

// Interface for tracking cells visited during a gesture
interface VisitedCell {
  row: number;
  col: number;
}

const Matrix: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let attributes = objectNode.attributes;
  useSelection();
  let editing = useRef<Position | null>(null);
  let canvasRef = useRef<HTMLCanvasElement>(null);
  let containerRef = useRef<HTMLDivElement>(null);
  let requestRef = useRef<number | null>(null);
  let needsRedraw = useRef<boolean>(true);
  let scaleRef = useRef<number>(1);

  // Keep track of cells visited during a gesture to prevent duplicate updates
  let visitedCells = useRef<VisitedCell[]>([]);

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

  // State to track hover and active states
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  // Values state - will be updated when the buffer changes
  const [values, setValues] = useState<number[]>([]);
  const { value: valueUpdate } = useValue();
  usePosition();
  const { lockedMode } = useLocked();

  // Get size from objectNode, defaulting to 100x100 if not set
  const size = objectNode.size || { width: 100, height: 100 };
  const { width, height } = size;

  // Calculate cell dimensions
  let cols = Math.min(columns as number, pageSize as number);
  let size_x = (width - cols * 4) / cols;
  let size_y = (height - (rows as number) * 4) / (rows as number);

  let { rowToShow, show } = objectNode.attributes;

  if (show === "row") {
    size_y = height;
  }

  // Parse disabled columns
  const disabledColumnsArray = React.useMemo(() => {
    return disabledColumns === undefined
      ? []
      : Array.isArray(disabledColumns)
        ? (disabledColumns as number[])
        : typeof disabledColumns === "number"
          ? [disabledColumns]
          : (disabledColumns as string)
              .split(",")
              .filter((x) => x !== "")
              .map((x) => parseInt(x));
  }, [disabledColumns]);

  // Update values from buffer
  useEffect(() => {
    if (objectNode.buffer) {
      if (type === "object") {
        const newValues = Array.from({ length: (columns as number) * (rows as number) }, (_, i) => {
          if (!objectNode.buffer) return 0;
          if (!objectNode.buffer[i]) return 0;
          return (objectNode.buffer[i] as MessageObject)[selectedField as string] || 0;
        });
        setValues(newValues as number[]);
      } else {
        const newValues = Array.from(objectNode.buffer as Float32Array | Uint8Array);
        setValues(newValues);
      }
    }
    needsRedraw.current = true;
  }, [objectNode.buffer, valueUpdate, selectedField, type, columns, rows]);

  // Function to toggle/set a cell value
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
    [columns, rows, selectedField, objectNode],
  );

  // Check if a cell has been visited during current gesture
  const hasCellBeenVisited = useCallback((row: number, col: number) => {
    return visitedCells.current.some((cell) => cell.row === row && cell.col === col);
  }, []);

  // Add a cell to the visited list
  const addVisitedCell = useCallback((row: number, col: number) => {
    visitedCells.current.push({ row, col });
  }, []);

  // Set canvas size to match container size - only called on mount and resize
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Set canvas dimensions to match objectNode size
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Set high-DPI canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    scaleRef.current = dpr;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    needsRedraw.current = true;
  }, [width, height]);

  // Handle size updates
  useEffect(() => {
    updateCanvasSize();
  }, [updateCanvasSize, width, height]);

  // Draw function - optimized to avoid flickering
  const drawMatrix = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !needsRedraw.current) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Clear canvas with background color
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Account for high-DPI displays
    const dpr = scaleRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Calculate cell dimensions
    const cellWidth = size_x;
    const cellHeight = size_y;
    const margin = 2;

    // Determine which cells to render based on show mode
    const cellsToRender =
      show === "row"
        ? [
            [...Array(columns as number).keys()]
              .slice(pageStart as number, (pageStart as number) + (pageSize as number))
              .map((col) => ({ row: rowToShow as number, col })),
          ]
        : [...Array(rows as number).keys()].map((row) =>
            [...Array(columns as number).keys()]
              .slice(pageStart as number, (pageStart as number) + (pageSize as number))
              .map((col) => ({ row, col })),
          );

    // Draw cells
    cellsToRender.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        const { row: actualRow, col: actualCol } = cell;
        const x = colIdx * (cellWidth + margin * 2) + margin;
        const y = rowIdx * (cellHeight + margin * 2) + margin;
        const idx = actualRow * (columns as number) + actualCol;
        const value = values[idx] || 0;
        const normalizedValue = (value - (min as number)) / ((max as number) - (min as number));
        const isDisabled = disabledColumnsArray.includes(actualCol);
        const isHovered = hoverCell?.row === actualRow && hoverCell?.col === actualCol;
        const isActive = activeCell?.row === actualRow && activeCell?.col === actualCol;

        // Draw cell background
        ctx.beginPath();

        // Apply corner radius based on setting
        if (cornerRadius === "full") {
          // Full rounded cell (complete rounded rectangle)
          const radius = Math.min(cellWidth, cellHeight) / 2;
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + cellWidth, y, x + cellWidth, y + cellHeight, radius);
          ctx.arcTo(x + cellWidth, y + cellHeight, x, y + cellHeight, radius);
          ctx.arcTo(x, y + cellHeight, x, y, radius);
          ctx.arcTo(x, y, x + cellWidth, y, radius);
        } else if (cornerRadius === "lg") {
          // Large corner radius
          const radius = Math.min(cellWidth, cellHeight) / 4;
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + cellWidth, y, x + cellWidth, y + cellHeight, radius);
          ctx.arcTo(x + cellWidth, y + cellHeight, x, y + cellHeight, radius);
          ctx.arcTo(x, y + cellHeight, x, y, radius);
          ctx.arcTo(x, y, x + cellWidth, y, radius);
        } else if (cornerRadius === "sm") {
          // Small corner radius
          const radius = Math.min(cellWidth, cellHeight) / 8;
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + cellWidth, y, x + cellWidth, y + cellHeight, radius);
          ctx.arcTo(x + cellWidth, y + cellHeight, x, y + cellHeight, radius);
          ctx.arcTo(x, y + cellHeight, x, y, radius);
          ctx.arcTo(x, y, x + cellWidth, y, radius);
        } else {
          // No corner radius (rectangle)
          ctx.rect(x, y, cellWidth, cellHeight);
        }

        // Cell styling
        if (isDisabled) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        } else if (isActive) {
          ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
        } else if (isHovered && lockedMode) {
          ctx.fillStyle = "rgba(40, 40, 40, 0.5)";
        } else {
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        }
        ctx.fill();

        // Cell border
        ctx.strokeStyle = isActive ? "rgba(255, 255, 255, 0.8)" : "rgba(40, 40, 40, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Get the cell content display mode
        const ux = objectNode.attributes["ux"] as string;
        const isLine = ux === "line";
        const isBar = ux === "bar";
        const isFullRadius = cornerRadius === "full";

        // Draw the fill based on the value
        if (value !== 0 && !isDisabled) {
          ctx.beginPath();

          if (isLine) {
            // Line mode
            ctx.fillStyle = fillColor as string;
            const lineHeight = 2;
            const lineY = y + cellHeight - normalizedValue * cellHeight;
            ctx.rect(x, lineY, cellWidth, lineHeight);
            ctx.fill();
          } else if (isBar) {
            // Bar mode
            ctx.fillStyle = fillColor as string;
            const barWidth = cellWidth * 0.08; // 8% of cell width
            const barHeight = normalizedValue * cellHeight;
            const barX = x + (cellWidth - barWidth) / 2;
            const barY = y + cellHeight - barHeight;

            // Draw bar
            ctx.rect(barX, barY, barWidth, barHeight);
            ctx.fill();

            // Draw circle at top of bar
            ctx.beginPath();
            const circleRadius = barWidth * 1.5;
            ctx.arc(barX + barWidth / 2, barY, circleRadius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Standard mode (fill from bottom)
            ctx.fillStyle = fillColor as string;
            if (isFullRadius) {
              // For full radius, scale the entire shape
              const fillWidth = cellWidth * normalizedValue;
              const fillHeight = cellHeight * normalizedValue;
              const fillX = x + (cellWidth - fillWidth) / 2;
              const fillY = y + (cellHeight - fillHeight) / 2;

              const radius = Math.min(fillWidth, fillHeight) / 2;
              ctx.moveTo(fillX + radius, fillY);
              ctx.arcTo(fillX + fillWidth, fillY, fillX + fillWidth, fillY + fillHeight, radius);
              ctx.arcTo(fillX + fillWidth, fillY + fillHeight, fillX, fillY + fillHeight, radius);
              ctx.arcTo(fillX, fillY + fillHeight, fillX, fillY, radius);
              ctx.arcTo(fillX, fillY, fillX + fillWidth, fillY, radius);
            } else {
              // Normal fill from bottom
              const fillHeight = normalizedValue * cellHeight;
              ctx.rect(x, y + cellHeight - fillHeight, cellWidth, fillHeight);
            }
            ctx.fill();
          }
        }

        // Show value if enabled (on hover)
        if (showValue && isHovered) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.font = "8px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          let displayText = "";

          // Check for options (labels)
          const options = objectNode.attributes.options;
          if (options) {
            const array = Array.isArray(options)
              ? options
              : typeof options === "number"
                ? [options]
                : (options as string).split(",");
            displayText = array[Math.floor(value) % array.length] as string;
          } else {
            // Format number based on range
            displayText = `${(max as number) > 1 ? Math.round(value) : Math.round(100 * value) / 100} ${unit}`;
          }

          ctx.fillText(displayText, x + cellWidth / 2, y + cellHeight / 2);
        }
      });
    });

    needsRedraw.current = false;
  }, [
    values,
    size_x,
    size_y,
    rows,
    columns,
    min,
    max,
    fillColor,
    cornerRadius,
    showValue,
    unit,
    disabledColumnsArray,
    hoverCell,
    activeCell,
    pageSize,
    pageStart,
    show,
    rowToShow,
    lockedMode,
    objectNode.attributes,
  ]);

  // Animation frame-based rendering to avoid flickering
  const animate = useCallback(() => {
    drawMatrix();
    requestRef.current = requestAnimationFrame(animate);
  }, [drawMatrix]);

  // Set up animation loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  // Mark for redraw when hover/active state changes
  useEffect(() => {
    needsRedraw.current = true;
  }, [hoverCell, activeCell]);

  // Mouse event handlers
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onMouseUp = useCallback(() => {
    editing.current = null;
    visitedCells.current = [];
    setActiveCell(null);
    needsRedraw.current = true;
  }, []);

  // Calculate new value based on vertical movement relative to previous position
  const calculateValueFromMovement = useCallback(
    (mouseY: number, editInfo: Position) => {
      // Calculate how far the mouse has moved vertically
      const verticalMovement = editInfo.lastMouseY - mouseY;

      // Scale the movement to a change in value (negative movement = lower value)
      const valueRange = (max as number) - (min as number);
      const sensitivity = 1.0; // Same sensitivity for both modes

      // Calculate value change exactly the same way for both modes
      const valueChange = (verticalMovement / editInfo.cellHeight) * valueRange * sensitivity;

      // Use precise value for calculations in rounded mode if available
      let baseValue;
      if (objectNode.attributes["round"] && "preciseValue" in editInfo) {
        baseValue = editInfo.preciseValue;
      } else {
        baseValue = editInfo.lastSetValue;
      }

      const newPreciseValue = baseValue + valueChange;

      // Return both the precise value for internal tracking and the displayed value
      return {
        preciseValue: newPreciseValue,
        displayValue: objectNode.attributes["round"]
          ? Math.round(newPreciseValue)
          : newPreciseValue,
      };
    },
    [min, max, objectNode.attributes],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || !editing.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      // Calculate new value based on the movement from last position
      const { preciseValue, displayValue } = calculateValueFromMovement(mouseY, editing.current);

      // If the display value hasn't changed, we can exit early to prevent unnecessary updates
      if (displayValue === editing.current.lastSetValue) {
        return;
      }

      // Clamp value to min/max range (for display value)
      const clampedValue = Math.max(min as number, Math.min(max as number, displayValue));

      // Handle NaN
      const finalValue = isNaN(clampedValue) ? 0 : clampedValue;

      // Update the value in the matrix
      toggle(editing.current.y, editing.current.x, finalValue);
      if (objectNode.custom) {
        (objectNode.custom as any as mat.Matrix).update();
      }

      // Update editing state with new values and position
      editing.current = {
        ...editing.current,
        lastSetValue: finalValue,
        preciseValue: preciseValue, // Keep track of the precise value for next calculation
        lastMouseY: mouseY,
      };

      needsRedraw.current = true;
    },
    [calculateValueFromMovement, toggle, min, max, objectNode],
  );

  // Get cell coordinates and row offset from mouse position
  const getCellFromMouseEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!containerRef.current) return null;

      // Get the correct size from the canvas element itself
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const cellWidth = size_x + 4; // Including margins
      const cellHeight = size_y + 4; // Including margins

      let col = Math.floor(x / cellWidth);
      let row = Math.floor(y / cellHeight);

      // Calculate row vertical offset (top of the row)
      const rowOffset = row * cellHeight;

      // Calculate relative position within the cell (0 at bottom, 1 at top)
      const relY = y - rowOffset;
      const relativePosition = 1 - relY / cellHeight;

      // Adjust for page start
      col += pageStart as number;

      // Adjust for show mode
      if (show === "row") {
        row = rowToShow as number;
      }

      // Validate cell is within bounds
      if (
        col < 0 ||
        col >= (columns as number) ||
        row < 0 ||
        row >= (rows as number) ||
        col >= (pageStart as number) + (pageSize as number)
      ) {
        return null;
      }

      return { row, col, rowOffset, cellHeight, relativePosition };
    },
    [size_x, size_y, columns, rows, pageSize, pageStart, show, rowToShow],
  );

  // Mouse event handlers for canvas
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!lockedMode) return;

      e.stopPropagation();
      const cellInfo = getCellFromMouseEvent(e);
      if (!cellInfo) return;

      const { row, col, rowOffset, cellHeight, relativePosition } = cellInfo;

      // Check if column is disabled
      if (disabledColumnsArray.includes(col)) return;

      setActiveCell({ row, col });

      // Clear visited cells on new gesture
      visitedCells.current = [];

      if (
        !objectNode.attributes.toggle &&
        (type === "float" || type === "uint8" || type === "object")
      ) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const startY = e.clientY - rect.top - rowOffset;
        const idx = row * (columns as number) + col;
        const value = values[idx] || 0;

        // Set initial values based on click position when needed
        let initialValue = value;
        let preciseValue = value;

        if (objectNode.attributes["round"] && value === 0) {
          // Map vertical position to value range
          // relativePosition is 0 at bottom, 1 at top of cell
          const range = (max as number) - (min as number);
          // Calculate precise value based on vertical position
          preciseValue = (min as number) + relativePosition * range;
          // Round for display
          initialValue = Math.round(preciseValue);

          // Update the value immediately for better feedback
          toggle(row, col, initialValue);
        }

        // Store the mouse position and current value
        const mouseY = e.clientY - rect.top;

        // Store the relative position within the cell
        editing.current = {
          x: col,
          y: row,
          value: initialValue,
          startY,
          rowOffset,
          cellHeight,
          relativePosition,
          lastSetValue: initialValue,
          preciseValue: preciseValue, // Track precise unrounded value
          lastMouseY: mouseY,
        };

        // Mark this cell as visited
        addVisitedCell(row, col);
      } else {
        toggle(row, col);
        needsRedraw.current = true;
      }
    },
    [
      lockedMode,
      getCellFromMouseEvent,
      toggle,
      values,
      columns,
      type,
      disabledColumnsArray,
      objectNode.attributes.toggle,
      objectNode.attributes,
      min,
      max,
      addVisitedCell,
    ],
  );

  const handleMouseOver = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cellInfo = getCellFromMouseEvent(e);
      if (!cellInfo) {
        if (hoverCell !== null) {
          setHoverCell(null);
          needsRedraw.current = true;
        }
        return;
      }

      const { row, col, rowOffset, cellHeight, relativePosition } = cellInfo;

      // Update hover state if needed
      if (hoverCell?.row !== row || hoverCell?.col !== col) {
        setHoverCell({ row, col });
        needsRedraw.current = true;
      }

      // Handle cell value editing during drag
      if (!editing.current) return;

      // Skip if column is disabled
      if (disabledColumnsArray.includes(col)) return;

      // Skip if not in edit mode
      if (
        objectNode.attributes.toggle ||
        !(type === "float" || type === "uint8" || type === "object")
      ) {
        return;
      }

      // Check if we're already visited this cell during the current gesture
      // Also check if this is a different cell than the one we're currently editing
      if (
        hasCellBeenVisited(row, col) ||
        (editing.current.x === col && editing.current.y === row)
      ) {
        return;
      }

      // We've moved to a new cell
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseY = e.clientY - rect.top;
      const idx = row * (columns as number) + col;
      //editing.current.lastSetValue = (objectNode.buffer?.[idx] || 0) as number;

      // Use the last set value as the base for the new cell
      // Calculate the change based on vertical movement from the last position
      const ret = calculateValueFromMovement(mouseY, editing.current);
      const newValue = ret.displayValue;

      // Clamp and update the value
      const clampedValue = Math.max(min as number, Math.min(max as number, newValue));
      const finalValue = isNaN(clampedValue) ? 0 : clampedValue;
      const roundedValue = objectNode.attributes["round"] ? Math.round(finalValue) : finalValue;

      // Update this cell
      toggle(row, col, roundedValue);

      // Mark this cell as visited in this gesture
      addVisitedCell(row, col);

      // Update editing reference to track the new cell
      editing.current = {
        ...editing.current,
        x: col,
        y: row,
        rowOffset,
        cellHeight,
        lastSetValue: roundedValue,
        lastMouseY: mouseY,
      };

      needsRedraw.current = true;
    },
    [
      getCellFromMouseEvent,
      hoverCell,
      disabledColumnsArray,
      objectNode.attributes,
      type,
      toggle,
      calculateValueFromMovement,
      min,
      max,
      columns,
      hasCellBeenVisited,
      addVisitedCell,
    ],
  );

  const handleMouseOut = useCallback(() => {
    setHoverCell(null);
    needsRedraw.current = true;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width: width + "px",
        height: height + "px",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: width + "px",
          height: height + "px",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseOver}
        onMouseOut={handleMouseOut}
        onClick={lockedMode ? (e) => e.stopPropagation() : undefined}
      />
    </div>
  );
};

export default Matrix;
