import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import { useValue } from "@/contexts/ValueContext";
import type { Atom, Dot, Dash, ETPattern } from "@/lib/nodes/definitions/core/et-system/editor";
import { ObjectNode } from "@/lib/nodes/types";
import { useCallback, useEffect, useState, useRef } from "react";

// Helper functions for working with patterns
const calculateSize = (pattern: ETPattern): number => {
  return pattern.reduce((acc: number, atom) => {
    if (atom === 0) return (acc as number) + 1; // DOT_SIZE = 1
    if (atom === 1) return (acc as number) + 2; // DASH_SIZE = 2
    return ((acc as number) + (atom.size as number)) as number;
  }, 0);
};

// Helper to navigate to a pattern at a specific path
const getPatternAtPath = (path: number[], fullPattern: ETPattern): ETPattern => {
  if (path.length === 1) return fullPattern;

  let currentPattern = fullPattern;
  for (let i = 0; i < path.length - 1; i++) {
    const index = path[i];
    const atom = currentPattern[index];
    if (typeof atom === "object" && "pattern" in atom) {
      currentPattern = atom.pattern;
    } else {
      return fullPattern; // Invalid path, return top-level pattern
    }
  }
  return currentPattern;
};

export const ETEditor = ({ objectNode }: { objectNode: ObjectNode }) => {
  const [pattern, setPattern] = useState<ETPattern>((objectNode.custom?.value as ETPattern) || []);
  const [cursorPath, setCursorPath] = useState<number[]>([0]);
  const [selectedSymbols, setSelectedSymbols] = useState<number[][]>([]);
  const [selectedNestedPattern, setSelectedNestedPattern] = useState<number[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedNodes } = useSelection();
  const { lockedMode } = useLocked();
  usePosition();
  useValue();

  const size = objectNode.size || { width: 100, height: 100 };
  const uxEditing = useRef(false);

  // Calculate dynamic base width and heights based on objectNode.size and pattern size
  const patternTotalSize = pattern.reduce((acc: number, atom) => {
    if (atom === 0) return acc + 1; // DOT_SIZE
    if (atom === 1) return acc + 2; // DASH_SIZE
    return acc + atom.size;
  }, 0);

  // Ensure we have a minimum size to prevent elements from becoming too small
  const minBaseWidth = 12;
  // Calculate BASE_WIDTH dynamically based on container width and pattern size
  // Add some padding (8px) to account for margin/border
  const BASE_WIDTH = Math.max(
    minBaseWidth,
    Math.floor((size.width - 8) / Math.max(patternTotalSize, 1)),
  );
  // For height, use the container height divided by 2 to give room for nested patterns
  const BASE_HEIGHT = Math.max(minBaseWidth, Math.floor((size.height - 8) / 2));
  // Use the smaller of width or height to ensure proportional sizing
  const BASE_SIZE = Math.min(BASE_WIDTH, BASE_HEIGHT);

  // Constants derived from BASE_SIZE
  const DOT_SIZE = 1;
  const DASH_SIZE = 2;

  useEffect(() => {
    if (uxEditing.current) return;
    if (objectNode.custom?.value) setPattern(objectNode.custom?.value as ETPattern);
  }, [objectNode.custom?.value]);

  // Add an event handler for direct container clicks to position cursor
  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!lockedMode || !selectedNodes.includes(objectNode)) return;

      // If clicking on the background (not an atom), position cursor at the end
      if (e.target === containerRef.current) {
        setCursorPath([pattern.length]);
        if (!isDragging) {
          setSelectedSymbols([]);
        }
        setSelectedNestedPattern(null);
      }
    },
    [isDragging, lockedMode, selectedNodes, objectNode, pattern],
  );

  // Update pattern output when changes occur
  useEffect(() => {
    uxEditing.current = true;
    objectNode.receive(objectNode.inlets[0], JSON.stringify(pattern));
    setTimeout(() => {
      uxEditing.current = false;
    }, 200);
  }, [pattern, objectNode]);

  // Update selected nested pattern based on cursor position
  useEffect(() => {
    if (cursorPath.length > 1) {
      // Cursor is inside a nested pattern, so select the containing pattern
      const parentPath = cursorPath.slice(0, -1);
      const atom = getAtomAtPath(parentPath, pattern);

      if (atom && typeof atom === "object" && "pattern" in atom) {
        setSelectedNestedPattern(parentPath);
      }
    } else {
      // Cursor is at top level, clear nested pattern selection
      setSelectedNestedPattern(null);
    }
  }, [cursorPath, pattern]);

  // Helper to check if a path is selected
  const isPathSelected = (path: number[]): boolean => {
    return selectedSymbols.some(
      (selPath) => selPath.length === path.length && selPath.every((val, idx) => val === path[idx]),
    );
  };

  // Insert atom at current cursor position
  const insertAtCursor = (atom: Atom) => {
    const newPattern = [...pattern];
    let currentPattern = getPatternAtPath(cursorPath, newPattern);

    const currentPosition = cursorPath[cursorPath.length - 1];
    currentPattern.splice(currentPosition, 0, atom);

    setPattern(newPattern);

    // Move cursor forward
    const newCursorPath = [...cursorPath];
    newCursorPath[newCursorPath.length - 1] = currentPosition + 1;
    setCursorPath(newCursorPath);
  };

  // Delete atom at current cursor position
  const deleteAtCursor = () => {
    const currentPosition = cursorPath[cursorPath.length - 1];

    // If at the beginning of a pattern, try to move up
    if (currentPosition === 0) {
      if (cursorPath.length > 1) {
        setCursorPath(cursorPath.slice(0, -1));
      }
      return;
    }

    const newPattern = [...pattern];
    let currentPattern = getPatternAtPath(cursorPath, newPattern);

    // Delete at the position before cursor
    currentPattern.splice(currentPosition - 1, 1);
    setPattern(newPattern);

    // Move cursor backward
    const newCursorPath = [...cursorPath];
    newCursorPath[newCursorPath.length - 1] = currentPosition - 1;
    setCursorPath(newCursorPath);
  };

  // Create a nested pattern from selected symbols
  const createNestedPattern = () => {
    if (selectedSymbols.length === 0) return;

    // For simplicity, only handle selections within the same pattern level
    const firstPath = selectedSymbols[0];
    const patternLevel = firstPath.length - 1;

    // Check if all selections are at the same level
    if (!selectedSymbols.every((path) => path.length - 1 === patternLevel)) {
      console.warn("Cannot create nested pattern from selections at different levels");
      return;
    }

    // Get the indices at the current level
    const indices = selectedSymbols.map((path) => path[path.length - 1]).sort((a, b) => a - b);

    // Get the current pattern
    const newPattern = [...pattern];
    let currentPattern = getPatternAtPath(firstPath.slice(0, patternLevel), newPattern);

    // Extract selected atoms
    const selectedAtoms = indices.map((index) => currentPattern[index]);
    const nestedSize = calculateSize(selectedAtoms);

    // Create the nested pattern object
    const nestedPattern = {
      pattern: [...selectedAtoms],
      size: nestedSize,
    };

    // Remove selected atoms in reverse order to avoid index issues
    for (let i = indices.length - 1; i >= 0; i--) {
      currentPattern.splice(indices[i], 1);
    }

    // Insert the nested pattern at the position of the first selected atom
    currentPattern.splice(indices[0], 0, nestedPattern);
    setPattern(newPattern);

    // Update cursor position
    const newCursorPath = firstPath.slice(0, patternLevel);
    newCursorPath.push(indices[0] + 1);
    setCursorPath(newCursorPath);

    // Clear selections
    setSelectedSymbols([]);
  };

  // Parse a path string from data-path attribute
  const parsePathString = (pathStr: string): number[] => {
    return pathStr.split("-").map((p) => parseInt(p));
  };

  // Handle mouse down on an atom
  const handleMouseDown = (e: React.MouseEvent, atomPath: number[]) => {
    if (!lockedMode || !selectedNodes.includes(objectNode)) return;

    // Prevent default to avoid text selection
    e.preventDefault();

    // Check if it's a nested pattern for selection
    const atom = getAtomAtPath(atomPath, pattern);
    if (atom && typeof atom === "object" && "pattern" in atom) {
      if (e.shiftKey) {
        // Add to selection
        setSelectedSymbols((prev) => [...prev, atomPath]);
      } else {
        // Set cursor inside the nested pattern at position 0
        // Selected nested pattern will be updated via effect when cursor changes
        setCursorPath([...atomPath, 0]);
        setSelectedSymbols([]);
      }
    } else {
      // Start drag selection or position cursor
      if (e.shiftKey) {
        // Start drag selection
        setIsDragging(true);
        setDragStart(atomPath);
        setSelectedSymbols((prev) => [...prev, atomPath]);
      } else {
        // Set cursor position directly to this atom's position
        // For top level atoms, set cursor after the atom
        if (atomPath.length === 1) {
          setCursorPath([atomPath[0] + 1]);
        } else {
          // For nested atoms, set cursor at this atom's position in parent
          setCursorPath([...atomPath]);
        }
        setSelectedSymbols([]);
      }
    }
  };

  // Handle mouse move for drag selection
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    // Find element under mouse
    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
    const pathAttr = elemBelow?.getAttribute("data-path");

    if (pathAttr) {
      const currentPath = parsePathString(pathAttr);

      // Only add to selection if not already selected and at same level as drag start
      if (currentPath.length === dragStart.length && !isPathSelected(currentPath)) {
        setSelectedSymbols((prev) => [...prev, currentPath]);
      }
    }
  };

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback((e: MouseEvent) => {
    setTimeout(() => {
      setIsDragging(false);
      setDragStart(null);
    }, 100);
  }, []);

  // Get an atom at a specific path
  const getAtomAtPath = (path: number[], fullPattern: ETPattern): Atom | null => {
    if (path.length === 0) return null;

    let currentPattern = fullPattern;
    let atom: Atom | null = null;

    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      atom = currentPattern[index];

      if (i < path.length - 1) {
        if (typeof atom === "object" && "pattern" in atom) {
          currentPattern = atom.pattern;
        } else {
          return null; // Invalid path
        }
      }
    }

    return atom;
  };

  // Replace selected symbols with a nested pattern
  const replaceSelectedWithNestedPattern = (nestedContent: ETPattern) => {
    if (selectedSymbols.length === 0) return;

    // Sort paths by depth (deeper paths first) to avoid index issues
    const sortedPaths = [...selectedSymbols].sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length;

      // If at same depth, sort by indices
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
      }
      return 0;
    });

    const newPattern = [...pattern];

    // Process each path
    for (const path of sortedPaths) {
      // Get the pattern at the parent level
      const parentPath = path.slice(0, -1);
      const currentIndex = path[path.length - 1];

      let parentPattern: ETPattern;
      if (parentPath.length === 0) {
        parentPattern = newPattern;
      } else {
        const parent = getAtomAtPath(parentPath, newPattern);
        if (typeof parent === "object" && parent && "pattern" in parent) {
          parentPattern = parent.pattern;
        } else {
          continue; // Skip if parent pattern not found
        }
      }

      // Replace atom with nested pattern
      const nestedSize = calculateSize(nestedContent);
      parentPattern[currentIndex] = {
        pattern: [...nestedContent],
        size: nestedSize,
      };
    }

    setPattern(newPattern);
    setSelectedSymbols([]);
  };

  // Update size of selected nested pattern
  const updateNestedPatternSize = (newSize: number) => {
    if (!selectedNestedPattern) return;

    const newPattern = [...pattern];
    const atom = getAtomAtPath(selectedNestedPattern, newPattern);

    if (typeof atom === "object" && atom && "pattern" in atom) {
      // Create a new nested pattern with updated size
      const parentPath = selectedNestedPattern.slice(0, -1);
      const currentIndex = selectedNestedPattern[selectedNestedPattern.length - 1];

      let parentPattern: ETPattern;
      if (parentPath.length === 0) {
        parentPattern = newPattern;
      } else {
        const parent = getAtomAtPath(parentPath, newPattern);
        if (parent && typeof parent === "object" && "pattern" in parent) {
          parentPattern = parent.pattern;
        } else {
          return; // Skip if parent pattern not found
        }
      }

      // Update the size
      parentPattern[currentIndex] = {
        ...atom,
        size: newSize,
      };

      setPattern(newPattern);
    }
  };

  // Render a single atom (dot, dash, or nested pattern)
  const renderAtom = (
    atom: Atom,
    atomPath: number[],
    isNested: boolean = false,
    scaleFactor: number = 1,
  ) => {
    if (isNested) {
      scaleFactor = Math.min(2, scaleFactor);
    }
    const isSelected = isPathSelected(atomPath);
    const isNestedSelected =
      selectedNestedPattern &&
      selectedNestedPattern.length === atomPath.length &&
      selectedNestedPattern.every((val, idx) => val === atomPath[idx]);
    const width = isNested ? BASE_SIZE * scaleFactor : BASE_SIZE;

    if (atom === 0) {
      // Dot
      return (
        <div
          key={atomPath.join("-")}
          className={`border-2 rounded-full ${!isSelected ? "border-white" : "bg-white"}`}
          style={{
            width: `${width}px`,
            height: `${width}px`,
            boxSizing: "border-box",
            margin: "1px",
            cursor: "pointer",
          }}
          data-path={atomPath.join("-")}
          onMouseDown={(e) => handleMouseDown(e, atomPath)}
        />
      );
    } else if (atom === 1) {
      // Dash
      return (
        <div
          key={atomPath.join("-")}
          className={`border-2 rounded-full ${!isSelected ? "border-white" : "bg-white"}`}
          style={{
            width: `${width * DASH_SIZE}px`,
            height: `${width}px`,
            boxSizing: "border-box",
            margin: "1px",
            cursor: "pointer",
          }}
          data-path={atomPath.join("-")}
          onMouseDown={(e) => handleMouseDown(e, atomPath)}
        />
      );
    } else if (typeof atom === "object" && "pattern" in atom) {
      // Render nested pattern
      return renderNestedPattern(
        atom,
        atomPath,
        Boolean(isSelected || isNestedSelected),
        scaleFactor,
      );
    }

    return null;
  };

  // Render a cursor element
  const renderCursor = (key: string, height: number = BASE_SIZE) => (
    <div
      key={key}
      className="animate-pulse bg-red-500"
      style={{
        width: "1px",
        height: `${height}px`,
        marginLeft: "0px",
        marginRight: "0px",
      }}
    />
  );

  // Render nested pattern
  const renderNestedPattern = (
    nestedPattern: { pattern: ETPattern; size: number },
    path: number[],
    isSelected: boolean,
    parentScaleFactor: number = 1,
  ) => {
    // Calculate scaling factor for nested elements
    const totalInnerSize = calculateSize(nestedPattern.pattern);
    const scaleFactor =
      1.5 *
      ((0.5 * nestedPattern.size) / (totalInnerSize > 0 ? totalInnerSize : 1)) *
      parentScaleFactor;

    // Width based on size
    const width = nestedPattern.size * BASE_SIZE * parentScaleFactor;

    // Check if cursor is within this nested pattern
    const isCursorInThisPattern =
      cursorPath.length > path.length && path.every((val, idx) => cursorPath[idx] === val);

    const elements = [];
    const currentPattern = nestedPattern.pattern;

    // If cursor is in this pattern, render atoms with cursor
    if (isCursorInThisPattern) {
      const cursorIndexInPattern = cursorPath[path.length];

      // Render atoms before cursor
      for (let i = 0; i < cursorIndexInPattern; i++) {
        elements.push(renderAtom(currentPattern[i], [...path, i], true, scaleFactor));
      }

      // Render cursor
      elements.push(
        renderCursor(
          `cursor-${path.join("-")}-${cursorIndexInPattern}`,
          BASE_SIZE * 1 * scaleFactor,
        ),
      );

      // Render atoms after cursor
      for (let i = cursorIndexInPattern; i < currentPattern.length; i++) {
        elements.push(renderAtom(currentPattern[i], [...path, i], true, scaleFactor));
      }
    } else {
      // Just render all atoms without cursor
      for (let i = 0; i < currentPattern.length; i++) {
        elements.push(renderAtom(currentPattern[i], [...path, i], true, scaleFactor));
      }
    }

    // Check if this is the selected nested pattern for editing size
    const isNestedSelected =
      selectedNestedPattern &&
      selectedNestedPattern.length === path.length &&
      selectedNestedPattern.every((val, idx) => val === path[idx]);

    // Determine border style based on selection state
    let borderClass = "border-gray-500";
    if (isSelected) borderClass = "border-blue-500";
    if (isNestedSelected) borderClass = "border-yellow-500 border-2";

    // Return the container with content
    return (
      <div
        key={path.join("-")}
        className={`relative border rounded-md ${borderClass} flex items-center justify-center p-0`}
        style={{
          width: `${width}px`,
          height: `${BASE_SIZE * 2 * parentScaleFactor}px`,
          boxSizing: "border-box",
          cursor: "pointer",
        }}
        data-path={path.join("-")}
        onMouseDown={(e) => handleMouseDown(e, path)}
      >
        {elements}
        <div className="bottom-0 right-1 text-xs absolute">
          {nestedPattern.size}
          {isNestedSelected && <span className="ml-1 animate-pulse text-yellow-400">✏</span>}
        </div>
      </div>
    );
  };

  // Render the main pattern with cursor
  const renderPattern = () => {
    const elements = [];

    // Iterate through pattern and render atoms with cursor in the right place
    for (let i = 0; i <= pattern.length; i++) {
      // Check if cursor should be at this position (top level only)
      if (cursorPath.length === 1 && cursorPath[0] === i) {
        elements.push(renderCursor(`cursor-${i}`, BASE_SIZE));
      }

      // If we're at the end, don't try to render an atom
      if (i === pattern.length) continue;

      // Render atom at this position
      elements.push(renderAtom(pattern[i], [i], false));
    }

    return elements;
  };

  // Handle keyboard input
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!lockedMode || !selectedNodes.includes(objectNode)) return;

      // Handle size editing for selected nested pattern
      if (selectedNestedPattern && /^[0-9]$/.test(e.key)) {
        // Only trigger size editing with Alt+number to avoid conflicts
        // with normal typing when cursor is inside the pattern
        const digit = parseInt(e.key);
        const atom = getAtomAtPath(selectedNestedPattern, pattern);

        if (atom && typeof atom === "object" && "pattern" in atom) {
          // Instead of appending, we just set the size directly to the entered digit
          updateNestedPatternSize(digit);
          e.preventDefault(); // Prevent default to avoid inserting digit in the pattern
        }
        return;
      }

      if (selectedNestedPattern && e.key === "ArrowUp") {
        const atom = getAtomAtPath(selectedNestedPattern, pattern);

        if (atom && typeof atom === "object" && "pattern" in atom) {
          // Instead of appending, we just set the size directly to the entered digit
          updateNestedPatternSize(atom.size + 1);
          e.preventDefault(); // Prevent default to avoid inserting digit in the pattern
        }
        return;
      }

      if (selectedNestedPattern && e.key === "ArrowDown") {
        const atom = getAtomAtPath(selectedNestedPattern, pattern);

        if (atom && typeof atom === "object" && "pattern" in atom) {
          // Instead of appending, we just set the size directly to the entered digit
          updateNestedPatternSize(atom.size - 1);
          e.preventDefault(); // Prevent default to avoid inserting digit in the pattern
        }
        return;
      }

      // Handle special patterns for selected symbols
      if (selectedSymbols.length > 0) {
        // Replace selected with dot pattern
        if (e.key === "d" || e.key === "D") {
          replaceSelectedWithNestedPattern([0]);
          return;
        }

        // Replace selected with dash pattern
        if (e.key === "a" || e.key === "A") {
          replaceSelectedWithNestedPattern([1]);
          return;
        }
      }

      const currentPattern = getPatternAtPath(cursorPath, pattern);
      const currentPosition = cursorPath[cursorPath.length - 1];

      switch (e.key) {
        case "o":
          insertAtCursor(0); // Insert dot
          break;
        case "-":
          insertAtCursor(1); // Insert dash
          break;
        case "Backspace":
          if (selectedSymbols.length > 0) {
            setSelectedSymbols([]);
          } else {
            deleteAtCursor();
          }
          break;
        case "Enter":
          createNestedPattern();
          break;
        case "ArrowLeft":
          if (currentPosition > 0) {
            // Move cursor left within current pattern
            setCursorPath([...cursorPath.slice(0, -1), currentPosition - 1]);
          } else if (cursorPath.length > 1) {
            // Move out of nested pattern to parent
            setCursorPath(cursorPath.slice(0, -1));
          }

          if (e.metaKey) {
            // Update selection
            setSelectedSymbols((prev) => prev.slice(0, prev.length - 1));
          }
          break;
        case "ArrowRight":
          if (currentPosition < currentPattern.length) {
            // Check if moving into a nested pattern
            const nextAtom = currentPattern[currentPosition];

            if (typeof nextAtom === "object" && "pattern" in nextAtom) {
              // Move cursor into nested pattern
              setCursorPath([...cursorPath, 0]);
            } else {
              // Move cursor right within current pattern
              setCursorPath([...cursorPath.slice(0, -1), currentPosition + 1]);
            }
          } else if (cursorPath.length > 1) {
            // At the end of a nested pattern, move back to parent after the nested pattern
            const parentPath = cursorPath.slice(0, -1);
            const parentPosition = parentPath[parentPath.length - 1];
            setCursorPath([...parentPath.slice(0, -1), parentPosition + 1]);
          }

          if (e.metaKey) {
            // Update selection
            setSelectedSymbols((prev) => [...prev, [...cursorPath]]);
          }
          break;
        case "Escape":
          // Clear selections and move cursor up to parent pattern if in a nested pattern
          setSelectedSymbols([]);
          setSelectedNestedPattern(null);
          if (cursorPath.length > 1) {
            setCursorPath(cursorPath.slice(0, -1));
          }
          break;
      }
    },
    [
      pattern,
      lockedMode,
      selectedNodes,
      selectedSymbols,
      cursorPath,
      objectNode,
      selectedNestedPattern,
    ],
  );

  // Setup event listeners
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onKeyDown, handleMouseUp]);

  // Calculate total size of the pattern
  const patternSize = pattern.reduce((acc: number, atom) => {
    if (atom === 0) return acc + 1;
    if (atom === 1) return acc + 2;
    return acc + atom.size;
  }, 0);

  return (
    <div
      ref={containerRef}
      className="bg-black text-white w-full h-full flex flex-wrap items-center p-2 gap-0 relative"
      onMouseMove={handleMouseMove}
      onClick={handleContainerClick}
    >
      {renderPattern()}
      <div className="right-1 bottom-1 absolute">{patternSize}</div>
    </div>
  );
};
