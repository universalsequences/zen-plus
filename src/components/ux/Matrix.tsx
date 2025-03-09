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
  relativePosition: number;
  lastSetValue: number;
  preciseValue: number;
  lastMouseY: number;
}

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
  let needsRedraw = useRef<boolean>(true);
  let scaleRef = useRef<number>(1);
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

  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const { value: valueUpdate } = useValue();
  usePosition();
  const { lockedMode } = useLocked();

  const size = objectNode.size || { width: 100, height: 100 };
  const { width, height } = size;

  let cols = Math.min(columns as number, pageSize as number);
  let size_x = (width - cols * 4) / cols;
  let size_y = (height - (rows as number) * 4) / (rows as number);

  let { rowToShow, show } = objectNode.attributes;
  if (show === "row") {
    size_y = height;
  }

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

  const hasCellBeenVisited = useCallback((row: number, col: number) => {
    return visitedCells.current.some((cell) => cell.row === row && cell.col === col);
  }, []);

  const addVisitedCell = useCallback((row: number, col: number) => {
    visitedCells.current.push({ row, col });
  }, []);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const dpr = window.devicePixelRatio || 1;
    scaleRef.current = dpr;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    needsRedraw.current = true;
    drawMatrix(); // Explicitly draw after resizing
  }, [width, height]);

  const drawMatrix = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !needsRedraw.current) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const dpr = scaleRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellWidth = Math.max(0.01, size_x);
    const cellHeight = Math.max(0.01, size_y);
    const margin = 2;

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

    cellsToRender.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        const { row: actualRow, col: actualCol } = cell;
        const x = colIdx * (cellWidth + margin * 2) + margin;
        const y = rowIdx * (cellHeight + margin * 2) + margin;
        const idx = actualRow * (columns as number) + actualCol;

        const value =
          type === "object"
            ? objectNode.buffer && objectNode.buffer[idx]
              ? (objectNode.buffer[idx] as MessageObject)[selectedField as string] || 0
              : 0
            : objectNode.buffer
              ? objectNode.buffer[idx] || 0
              : 0;

        const normalizedValue = (value - (min as number)) / ((max as number) - (min as number));
        const isDisabled = disabledColumnsArray.includes(actualCol);
        const isHovered = hoverCell?.row === actualRow && hoverCell?.col === actualCol;
        const isActive = activeCell?.row === actualRow && activeCell?.col === actualCol;

        ctx.beginPath();
        if (cornerRadius === "full") {
          const radius = Math.min(cellWidth, cellHeight) / 2;
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + cellWidth, y, x + cellWidth, y + cellHeight, radius);
          ctx.arcTo(x + cellWidth, y + cellHeight, x, y + cellHeight, radius);
          ctx.arcTo(x, y + cellHeight, x, y, radius);
          ctx.arcTo(x, y, x + cellWidth, y, radius);
        } else if (cornerRadius === "lg") {
          const radius = Math.min(cellWidth, cellHeight) / 4;
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + cellWidth, y, x + cellWidth, y + cellHeight, radius);
          ctx.arcTo(x + cellWidth, y + cellHeight, x, y + cellHeight, radius);
          ctx.arcTo(x, y + cellHeight, x, y, radius);
          ctx.arcTo(x, y, x + cellWidth, y, radius);
        } else if (cornerRadius === "sm") {
          const radius = Math.min(cellWidth, cellHeight) / 8;
          ctx.moveTo(x + radius, y);
          ctx.arcTo(x + cellWidth, y, x + cellWidth, y + cellHeight, radius);
          ctx.arcTo(x + cellWidth, y + cellHeight, x, y + cellHeight, radius);
          ctx.arcTo(x, y + cellHeight, x, y, radius);
          ctx.arcTo(x, y, x + cellWidth, y, radius);
        } else {
          ctx.rect(x, y, cellWidth, cellHeight);
        }

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

        ctx.strokeStyle = isActive ? "rgba(255, 255, 255, 0.8)" : "rgba(40, 40, 40, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const ux = objectNode.attributes["ux"] as string;
        const isLine = ux === "line";
        const isBar = ux === "bar";
        const isFullRadius = cornerRadius === "full";

        if (value !== 0 && !isDisabled) {
          ctx.beginPath();
          if (isLine) {
            ctx.fillStyle = fillColor as string;
            const lineHeight = 2;
            const lineY = y + cellHeight - normalizedValue * cellHeight;
            ctx.rect(x, lineY, cellWidth, lineHeight);
            ctx.fill();
          } else if (isBar) {
            ctx.fillStyle = fillColor as string;
            const barWidth = cellWidth * 0.08;
            const barHeight = normalizedValue * cellHeight;
            const barX = x + (cellWidth - barWidth) / 2;
            const barY = y + cellHeight - barHeight;
            ctx.rect(barX, barY, barWidth, barHeight);
            ctx.fill();

            const circleRadius = barWidth * 1.5;
            ctx.beginPath();
            ctx.arc(barX + barWidth / 2, barY, circleRadius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = fillColor as string;
            if (isFullRadius) {
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
              const fillHeight = normalizedValue * cellHeight;
              ctx.rect(x, y + cellHeight - fillHeight, cellWidth, fillHeight);
            }
            ctx.fill();
          }
        }

        if (showValue && isHovered) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.font = "8px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          let displayText = "";
          const options = objectNode.attributes.options;
          if (options) {
            const array = Array.isArray(options)
              ? options
              : typeof options === "number"
                ? [options]
                : (options as string).split(",");
            displayText = array[Math.floor(value) % array.length] as string;
          } else {
            displayText = `${(max as number) > 1 ? Math.round(value) : Math.round(100 * value) / 100} ${unit}`;
          }
          ctx.fillText(displayText, x + cellWidth / 2, y + cellHeight / 2);
        }
      });
    });

    needsRedraw.current = false;
  }, [
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
    objectNode.buffer,
    selectedField,
    type,
  ]);

  useEffect(() => {
    updateCanvasSize();
  }, [updateCanvasSize, width, height]);

  useEffect(() => {
    needsRedraw.current = true;
    drawMatrix();
  }, [objectNode.buffer, drawMatrix, valueUpdate]);

  useEffect(() => {
    needsRedraw.current = true;
    drawMatrix();
  }, [hoverCell, activeCell, drawMatrix]);

  const onMouseUp = useCallback(() => {
    editing.current = null;
    visitedCells.current = [];
    setActiveCell(null);
    needsRedraw.current = true;
    drawMatrix();
  }, [drawMatrix]);

  const calculateValueFromMovement = useCallback(
    (mouseY: number, editInfo: Position) => {
      const verticalMovement = editInfo.lastMouseY - mouseY;
      const valueRange = (max as number) - (min as number);
      const sensitivity = objectNode.attributes.round ? 1.0 : 1.5;
      const valueChange = (verticalMovement / editInfo.cellHeight) * valueRange * sensitivity;
      let baseValue =
        objectNode.attributes["round"] && "preciseValue" in editInfo
          ? editInfo.preciseValue
          : editInfo.lastSetValue;
      const newPreciseValue = baseValue + valueChange;
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
      if (!containerRef.current || !editing.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const { preciseValue, displayValue } = calculateValueFromMovement(mouseY, editing.current);

      if (displayValue === editing.current.lastSetValue) return;

      const clampedValue = Math.max(min as number, Math.min(max as number, displayValue));
      const finalValue = isNaN(clampedValue) ? 0 : clampedValue;
      toggle(editing.current.y, editing.current.x, finalValue);
      if (objectNode.custom) {
        (objectNode.custom as any as mat.Matrix).update();
      }
      editing.current = {
        ...editing.current,
        lastSetValue: finalValue,
        preciseValue: preciseValue,
        lastMouseY: mouseY,
      };
      needsRedraw.current = true;
      drawMatrix();
    },
    [calculateValueFromMovement, toggle, min, max, objectNode, drawMatrix],
  );

  const getCellFromMouseEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Ensure the container reference exists
      if (!containerRef.current) return null;

      // Get mouse coordinates relative to the canvas
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Define cell dimensions and margins
      const margin = 2;
      const cellWidth = size_x;
      const cellHeight = size_y;
      const totalCellWidth = cellWidth + 2 * margin;
      const totalCellHeight = cellHeight + 2 * margin;

      let colIdx, rowIdx;

      if (show === "row") {
        // Handle "row" mode where only one row is displayed
        rowIdx = 0; // Only one row is shown at y = margin
        const cellY = margin;
        // Check if mouseY is within the row's vertical bounds
        if (mouseY < cellY || mouseY >= cellY + cellHeight) {
          return null;
        }
        // Calculate column index
        colIdx = Math.floor((mouseX - margin) / totalCellWidth);
        if (colIdx < 0 || colIdx >= cols) {
          return null;
        }
        const cellX = colIdx * totalCellWidth + margin;
        // Ensure mouseX is within the cell, not the margin
        if (mouseX < cellX || mouseX >= cellX + cellWidth) {
          return null;
        }
      } else {
        // Handle regular matrix mode
        colIdx = Math.floor((mouseX - margin) / totalCellWidth);
        rowIdx = Math.floor((mouseY - margin) / totalCellHeight);
        // Check if indices are within bounds
        if (colIdx < 0 || colIdx >= cols || rowIdx < 0 || rowIdx >= rows) {
          return null;
        }
        const cellX = colIdx * totalCellWidth + margin;
        const cellY = rowIdx * totalCellHeight + margin;
        // Ensure mouse is within the cell, not the margin
        if (
          mouseX < cellX ||
          mouseX >= cellX + cellWidth ||
          mouseY < cellY ||
          mouseY >= cellY + cellHeight
        ) {
          return null;
        }
      }

      // Calculate the exact position of the cell
      const cellX = colIdx * totalCellWidth + margin;
      const cellY = show === "row" ? margin : rowIdx * totalCellHeight + margin;

      // Handle circular cells when cornerRadius is "full"
      if (cornerRadius === "full") {
        const centerX = cellX + cellWidth / 2;
        const centerY = cellY + cellHeight / 2;
        const radius = Math.min(cellWidth, cellHeight) / 2;
        const distance = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
        if (distance > radius) {
          return null; // Mouse is outside the circular cell
        }
      }

      // Map colIdx to actual column considering pageStart
      const col = colIdx + (pageStart as number);
      // Set row based on mode
      const row = show === "row" ? (rowToShow as number) : rowIdx;

      // Calculate additional return values
      const rowOffset = show === "row" ? 0 : rowIdx * totalCellHeight;
      const relY = mouseY - cellY;
      const relativePosition = 1 - relY / cellHeight;

      // Return cell information
      return { row, col, rowOffset, cellHeight, relativePosition };
    },
    [size_x, size_y, columns, rows, pageSize, pageStart, show, rowToShow, cornerRadius],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!lockedMode) return;

      e.stopPropagation();
      const cellInfo = getCellFromMouseEvent(e);
      if (!cellInfo) return;

      const { row, col, rowOffset, cellHeight, relativePosition } = cellInfo;
      if (disabledColumnsArray.includes(col)) return;

      setActiveCell({ row, col });
      visitedCells.current = [];

      if (
        !objectNode.attributes.toggle &&
        (type === "float" || type === "uint8" || type === "object")
      ) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const startY = e.clientY - rect.top - rowOffset;
        const idx = row * (columns as number) + col;
        const value = objectNode.buffer
          ? type === "object"
            ? (objectNode.buffer[idx] as MessageObject)[selectedField as string] || 0
            : objectNode.buffer[idx] || 0
          : 0;

        let initialValue = value;
        let preciseValue = value;

        if (objectNode.attributes["round"] && value === 0) {
          const range = (max as number) - (min as number);
          preciseValue = (min as number) + relativePosition * range;
          initialValue = Math.round(preciseValue);
          toggle(row, col, initialValue);
        }

        const mouseY = e.clientY - rect.top;
        editing.current = {
          x: col,
          y: row,
          value: initialValue as number,
          startY,
          rowOffset,
          cellHeight,
          relativePosition,
          lastSetValue: initialValue as number,
          preciseValue: preciseValue as number,
          lastMouseY: mouseY,
        };

        addVisitedCell(row, col);
      } else {
        toggle(row, col);
      }
      needsRedraw.current = true;
      drawMatrix();
    },
    [
      lockedMode,
      getCellFromMouseEvent,
      toggle,
      columns,
      type,
      disabledColumnsArray,
      objectNode.attributes.toggle,
      objectNode.attributes,
      min,
      max,
      addVisitedCell,
      selectedField,
      drawMatrix,
    ],
  );

  const handleMouseOver = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cellInfo = getCellFromMouseEvent(e);
      if (!cellInfo) {
        if (hoverCell !== null) {
          setHoverCell(null);
          needsRedraw.current = true;
          drawMatrix();
        }
        return;
      }

      const { row, col, rowOffset, cellHeight, relativePosition } = cellInfo;
      if (hoverCell?.row !== row || hoverCell?.col !== col) {
        setHoverCell({ row, col });
        needsRedraw.current = true;
        drawMatrix();
      }

      if (!editing.current) return;

      if (disabledColumnsArray.includes(col)) return;

      if (
        objectNode.attributes.toggle ||
        !(type === "float" || type === "uint8" || type === "object")
      ) {
        return;
      }

      if (
        hasCellBeenVisited(row, col) ||
        (editing.current.x === col && editing.current.y === row)
      ) {
        return;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseY = e.clientY - rect.top;
      const { displayValue } = calculateValueFromMovement(mouseY, editing.current);
      const clampedValue = Math.max(min as number, Math.min(max as number, displayValue));
      const finalValue = isNaN(clampedValue) ? 0 : clampedValue;
      const roundedValue = objectNode.attributes["round"] ? Math.round(finalValue) : finalValue;

      toggle(row, col, roundedValue);
      addVisitedCell(row, col);

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
      drawMatrix();
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
      drawMatrix,
    ],
  );

  const handleMouseOut = useCallback(() => {
    setHoverCell(null);
    needsRedraw.current = true;
    drawMatrix();
  }, [drawMatrix]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

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
