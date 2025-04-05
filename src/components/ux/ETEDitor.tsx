import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { useSelection } from "@/contexts/SelectionContext";
import type { Atom, Dot, Dash, ETPattern } from "@/lib/nodes/definitions/core/et-system/editor";
import { ObjectNode } from "@/lib/nodes/types";
import { useCallback, useEffect, useState } from "react";

// Constants for sizing
const BASE_WIDTH = 32;
const BASE_HEIGHT = 32;
const DOT_SIZE = 1;
const DASH_SIZE = 2;

// Helper functions for working with patterns
const calculateSize = (pattern) => {
  return pattern.reduce((acc, atom) => {
    if (atom === 0) return acc + DOT_SIZE; // dot is size 1
    if (atom === 1) return acc + DASH_SIZE; // dash is size 2
    return acc + atom.size; // nested pattern returns its defined size
  }, 0);
};

function expandDashes(pattern: ETPattern): ETPattern {
  const result: ETPattern = [];

  for (let i = 0; i < pattern.length; i++) {
    const atom = pattern[i];

    // Check the type of atom
    if (atom === 1) {
      // If it's a Dash (1), add two Dashes
      result.push(1, 1);
    } else if (typeof atom === "object" && "pattern" in atom) {
      // If it's a nested pattern, recursively expand its pattern
      result.push({
        pattern: expandDashes(atom.pattern),
        size: atom.size,
      });
    } else {
      // For Dot (0) or any other type, add as is
      result.push(atom);
    }
  }

  return result;
}

export const ETEditor = ({ objectNode }: { objectNode: ObjectNode }) => {
  const [pattern, setPattern] = useState<ETPattern>((objectNode.custom?.value as ETPattern) || []);

  // Change from simple cursor index to cursor path
  const [cursorPath, setCursorPath] = useState<number[]>([0]);

  const { selectedNodes } = useSelection();
  const { lockedMode } = useLocked();
  const [selectedSymbols, setSelectedSymbols] = useState<number[][]>([]);

  // Debug state for development
  const [debugInfo, setDebugInfo] = useState({
    cursorPath: [0],
    selectedSymbols: [] as number[][],
  });

  useEffect(() => {
    console.log("pattern=", pattern);
    objectNode.receive(objectNode.inlets[0], JSON.stringify(expandDashes(pattern)));
  }, [pattern]);

  // Update debug info whenever relevant states change
  useEffect(() => {
    setDebugInfo({
      cursorPath,
      selectedSymbols,
    });
  }, [cursorPath, selectedSymbols]);

  usePosition();

  const size = objectNode.size || { width: 100, height: 100 };

  // Helper to get the current pattern based on cursor path
  const getCurrentPattern = (path: number[], fullPattern: ETPattern): ETPattern => {
    if (path.length === 1) return fullPattern;

    // Navigate to the nested pattern
    let currentPattern = fullPattern;
    for (let i = 0; i < path.length - 1; i++) {
      const index = path[i];
      const atom = currentPattern[index];
      if (typeof atom === "object" && "pattern" in atom) {
        currentPattern = atom.pattern;
      } else {
        // Invalid path, return top-level pattern
        return fullPattern;
      }
    }
    return currentPattern;
  };

  // Get the current cursor position in the current pattern
  const getCurrentCursorPosition = (): number => {
    return cursorPath[cursorPath.length - 1];
  };

  // Insert atom at current cursor position
  const insertAtCursor = (atom: Atom) => {
    const newPattern = [...pattern];
    let currentPattern = newPattern;

    // Navigate to the correct nested pattern
    for (let i = 0; i < cursorPath.length - 1; i++) {
      const index = cursorPath[i];
      const currentAtom = currentPattern[index];

      if (typeof currentAtom === "object" && "pattern" in currentAtom) {
        currentPattern = currentAtom.pattern;
      }
    }

    // Insert at the current position
    const currentPosition = cursorPath[cursorPath.length - 1];
    currentPattern.splice(currentPosition, 0, atom);

    // Update the pattern
    setPattern(newPattern);

    // Move cursor forward
    const newCursorPath = [...cursorPath];
    newCursorPath[newCursorPath.length - 1] = currentPosition + 1;
    setCursorPath(newCursorPath);
  };

  // Delete atom at current cursor position
  const deleteAtCursor = () => {
    if (getCurrentCursorPosition() === 0) {
      // If at the beginning of a nested pattern, try to move up
      if (cursorPath.length > 1) {
        const newPath = [...cursorPath];
        newPath.pop();
        setCursorPath(newPath);
        return;
      }
      return; // Already at the beginning of the top-level pattern
    }

    const newPattern = [...pattern];
    let currentPattern = newPattern;

    // Navigate to the correct nested pattern
    for (let i = 0; i < cursorPath.length - 1; i++) {
      const index = cursorPath[i];
      const currentAtom = currentPattern[index];

      if (typeof currentAtom === "object" && "pattern" in currentAtom) {
        currentPattern = currentAtom.pattern;
      }
    }

    // Delete at the position before cursor
    const currentPosition = cursorPath[cursorPath.length - 1];
    currentPattern.splice(currentPosition - 1, 1);

    // Update the pattern
    setPattern(newPattern);

    // Move cursor backward
    const newCursorPath = [...cursorPath];
    newCursorPath[newCursorPath.length - 1] = currentPosition - 1;
    setCursorPath(newCursorPath);
  };

  // Create a nested pattern from selected symbols
  const createNestedPattern = () => {
    if (selectedSymbols.length === 0) return;

    // For simplicity, we'll only handle selections within the same pattern level
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
    let currentPattern = newPattern;

    // Navigate to the correct pattern level
    for (let i = 0; i < patternLevel; i++) {
      const index = firstPath[i];
      const currentAtom = currentPattern[index];

      if (typeof currentAtom === "object" && "pattern" in currentAtom) {
        currentPattern = currentAtom.pattern;
      }
    }

    // Extract selected atoms
    const selectedAtoms = indices.map((index) => currentPattern[index]);

    // Calculate size of the nested pattern - this is crucial to maintain spacing
    const nestedSize = calculateSize(selectedAtoms);
    console.log("Creating nested pattern with size:", nestedSize, "from atoms:", selectedAtoms);

    // Create a copy of the selected atoms to avoid reference issues
    const selectedAtomsCopy = [...selectedAtoms];

    // Create the nested pattern object
    const nestedPattern = {
      pattern: selectedAtomsCopy,
      size: nestedSize,
    };

    // Remove selected atoms in reverse order to avoid index issues
    for (let i = indices.length - 1; i >= 0; i--) {
      currentPattern.splice(indices[i], 1);
    }

    // Insert the nested pattern at the position of the first selected atom
    currentPattern.splice(indices[0], 0, nestedPattern);

    // Update the pattern
    setPattern(newPattern);

    // Update cursor to point to after the new nested pattern
    const newCursorPath = firstPath.slice(0, patternLevel);
    newCursorPath.push(indices[0] + 1);
    setCursorPath(newCursorPath);

    // Clear selections
    setSelectedSymbols([]);
  };

  // Declare renderAtom function for recursive use
  const renderAtom = (atom: Atom, atomPath: number[], isSelected: boolean) => {
    if (atom === 0) {
      // Dot - make square to match the width
      return (
        <div
          key={atomPath.join("-")}
          className={`border-2 rounded-full ${!isSelected ? "border-white" : "bg-white"}`}
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${BASE_WIDTH}px`, // Match width for perfect circles
            boxSizing: "border-box",
            margin: "1px",
          }}
          data-path={atomPath.join("-")}
        />
      );
    } else if (atom === 1) {
      // Dash
      return (
        <div
          key={atomPath.join("-")}
          className={`border-2 rounded-full ${!isSelected ? "border-white" : "bg-white"}`}
          style={{
            width: `${BASE_WIDTH * DASH_SIZE}px`,
            height: `${BASE_WIDTH}px`, // Match dot height for consistency
            boxSizing: "border-box",
            margin: "1px",
          }}
          data-path={atomPath.join("-")}
        />
      );
    } else if (typeof atom === "object" && "pattern" in atom) {
      // Nested pattern
      return renderNestedPattern(atom, atomPath, isSelected);
    }

    return null;
  };

  // Render nested pattern
  const renderNestedPattern = (
    nestedPattern: { pattern: ETPattern; size: number },
    path: number[],
    isSelected: boolean,
  ) => {
    // Calculate width based on size
    const width = nestedPattern.size * BASE_WIDTH;

    // Calculate scaling factor for nested elements
    // This ensures elements fit proportionally within the nested pattern
    const totalElements = nestedPattern.pattern.length;
    const totalInnerSize = calculateSize(nestedPattern.pattern);
    const scaleFactor = (0.5 * nestedPattern.size) / (totalInnerSize > 0 ? totalInnerSize : 1);

    // Adjust the base width for children based on the scale factor
    const adjustedBaseWidth = BASE_WIDTH * scaleFactor;

    // Check if cursor is within this nested pattern
    const isCursorInThisPattern =
      cursorPath.length > path.length && path.every((val, idx) => cursorPath[idx] === val);

    // Render the nested pattern content
    const nestedContent = [];

    // Special case: if cursor is in this pattern, we need to render the cursor
    if (isCursorInThisPattern) {
      // Find the index in this pattern where the cursor is
      const cursorIndexInPattern = cursorPath[path.length];

      // Render atoms before cursor
      for (let i = 0; i < cursorIndexInPattern; i++) {
        const atom = nestedPattern.pattern[i];
        const atomPath = [...path, i];
        const atomIsSelected = selectedSymbols.some(
          (selPath) =>
            selPath.length === atomPath.length &&
            selPath.every((val, idx) => val === atomPath[idx]),
        );

        // Calculate size for this atom with scaling
        const atomSize = atom === 0 ? DOT_SIZE : atom === 1 ? DASH_SIZE : atom.size;
        const atomWidth = atomSize * adjustedBaseWidth;

        // Render atom with scaling
        if (atom === 0) {
          // Dot - scaled
          nestedContent.push(
            <div
              key={atomPath.join("-")}
              className={`border-2 rounded-full ${!atomIsSelected ? "border-white" : "bg-white"}`}
              style={{
                width: `${adjustedBaseWidth}px`,
                height: `${adjustedBaseWidth}px`,
                boxSizing: "border-box",
                margin: "1px",
              }}
              data-path={atomPath.join("-")}
            />,
          );
        } else if (atom === 1) {
          // Dash - scaled
          nestedContent.push(
            <div
              key={atomPath.join("-")}
              className={`border-2 rounded-full ${!atomIsSelected ? "border-white" : "bg-white"}`}
              style={{
                width: `${adjustedBaseWidth * DASH_SIZE}px`,
                height: `${adjustedBaseWidth}px`,
                boxSizing: "border-box",
                margin: "1px",
              }}
              data-path={atomPath.join("-")}
            />,
          );
        } else if (typeof atom === "object" && "pattern" in atom) {
          // Recursively render nested pattern with adjusted scale
          nestedContent.push(renderNestedPattern(atom, atomPath, atomIsSelected));
        }
      }

      // Render cursor
      nestedContent.push(
        <div
          key={`cursor-${path.join("-")}-${cursorIndexInPattern}`}
          className="animate-pulse bg-teal-500"
          style={{
            width: "1px",
            height: `${adjustedBaseWidth * 2}px`,
            marginLeft: "0px",
            marginRight: "0px",
          }}
        />,
      );

      // Render atoms after cursor
      for (let i = cursorIndexInPattern; i < nestedPattern.pattern.length; i++) {
        const atom = nestedPattern.pattern[i];
        const atomPath = [...path, i];
        const atomIsSelected = selectedSymbols.some(
          (selPath) =>
            selPath.length === atomPath.length &&
            selPath.every((val, idx) => val === atomPath[idx]),
        );

        // Calculate size for this atom with scaling
        const atomSize = atom === 0 ? DOT_SIZE : atom === 1 ? DASH_SIZE : atom.size;
        const atomWidth = atomSize * adjustedBaseWidth;

        // Render atom with scaling
        if (atom === 0) {
          // Dot - scaled
          nestedContent.push(
            <div
              key={atomPath.join("-")}
              className={`border-2 rounded-full ${!atomIsSelected ? "border-white" : "bg-white"}`}
              style={{
                width: `${adjustedBaseWidth}px`,
                height: `${adjustedBaseWidth}px`,
                boxSizing: "border-box",
                margin: "1px",
              }}
              data-path={atomPath.join("-")}
            />,
          );
        } else if (atom === 1) {
          // Dash - scaled
          nestedContent.push(
            <div
              key={atomPath.join("-")}
              className={`border-2 rounded-full ${!atomIsSelected ? "border-white" : "bg-white"}`}
              style={{
                width: `${adjustedBaseWidth * DASH_SIZE}px`,
                height: `${adjustedBaseWidth}px`,
                boxSizing: "border-box",
                margin: "1px",
              }}
              data-path={atomPath.join("-")}
            />,
          );
        } else if (typeof atom === "object" && "pattern" in atom) {
          // Recursively render nested pattern with adjusted scale
          nestedContent.push(renderNestedPattern(atom, atomPath, atomIsSelected));
        }
      }
    } else {
      // Just render all atoms without cursor
      for (let i = 0; i < nestedPattern.pattern.length; i++) {
        const atom = nestedPattern.pattern[i];
        const atomPath = [...path, i];
        const atomIsSelected = selectedSymbols.some(
          (selPath) =>
            selPath.length === atomPath.length &&
            selPath.every((val, idx) => val === atomPath[idx]),
        );

        // Calculate size for this atom with scaling
        const atomSize = atom === 0 ? DOT_SIZE : atom === 1 ? DASH_SIZE : atom.size;
        const atomWidth = atomSize * adjustedBaseWidth;

        // Render atom with scaling
        if (atom === 0) {
          // Dot - scaled
          nestedContent.push(
            <div
              key={atomPath.join("-")}
              className={`border-2 rounded-full ${!atomIsSelected ? "border-white" : "bg-white"}`}
              style={{
                width: `${adjustedBaseWidth}px`,
                height: `${adjustedBaseWidth}px`,
                boxSizing: "border-box",
                margin: "1px",
              }}
              data-path={atomPath.join("-")}
            />,
          );
        } else if (atom === 1) {
          // Dash - scaled
          nestedContent.push(
            <div
              key={atomPath.join("-")}
              className={`border-2 rounded-full ${!atomIsSelected ? "border-white" : "bg-white"}`}
              style={{
                width: `${adjustedBaseWidth * DASH_SIZE}px`,
                height: `${adjustedBaseWidth}px`,
                boxSizing: "border-box",
                margin: "1px",
              }}
              data-path={atomPath.join("-")}
            />,
          );
        } else if (typeof atom === "object" && "pattern" in atom) {
          // Recursively render nested pattern with adjusted scale
          nestedContent.push(renderNestedPattern(atom, atomPath, atomIsSelected));
        }
      }
    }

    // Return the container with content
    return (
      <div
        key={path.join("-")}
        className={`relative border rounded-md ${isSelected ? "border-blue-500" : "border-gray-500"} flex items-center justify-center p-0`}
        style={{
          width: `${width}px`,
          height: `${BASE_WIDTH * 2}px`,
          boxSizing: "border-box",
        }}
        data-path={path.join("-")}
      >
        {nestedContent}
        <div className="bottom-0 right-1 text-xs absolute">{nestedPattern.size}</div>
      </div>
    );
  };

  // Handle key events
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!lockedMode) {
        return;
      }

      if (!selectedNodes.includes(objectNode)) return;

      console.log("Key pressed:", e.key, "Current cursor path:", cursorPath);

      if (e.key === "o") {
        insertAtCursor(0); // Insert dot
      } else if (e.key === "-") {
        insertAtCursor(1); // Insert dash
      } else if (e.key === "Backspace") {
        if (selectedSymbols.length > 0) {
          // Delete selected symbols
          // This is simplified - a more complete implementation would handle
          // deleting selections at different levels
          setSelectedSymbols([]);
        } else {
          deleteAtCursor();
        }
      } else if (e.key === "Enter") {
        // Create nested pattern from selection
        createNestedPattern();
      } else if (e.key === "ArrowLeft") {
        const currentPosition = getCurrentCursorPosition();
        if (currentPosition > 0) {
          // Move cursor left within current pattern
          const newCursorPath = [...cursorPath];
          newCursorPath[newCursorPath.length - 1] = currentPosition - 1;
          setCursorPath(newCursorPath);
        } else if (cursorPath.length > 1) {
          // Move out of nested pattern to parent
          const newCursorPath = cursorPath.slice(0, -1);
          setCursorPath(newCursorPath);
        }

        if (e.metaKey) {
          // Update selection
          setSelectedSymbols((prev) => prev.slice(0, prev.length - 1));
        }
      } else if (e.key === "ArrowRight") {
        const currentPattern = getCurrentPattern(cursorPath, pattern);
        const currentPosition = getCurrentCursorPosition();

        if (currentPosition < currentPattern.length) {
          // Check if moving into a nested pattern
          const nextAtom = currentPattern[currentPosition];

          if (typeof nextAtom === "object" && "pattern" in nextAtom) {
            // Move cursor into nested pattern
            const newCursorPath = [...cursorPath];
            newCursorPath[newCursorPath.length - 1] = currentPosition;
            newCursorPath.push(0);
            setCursorPath(newCursorPath);
          } else {
            // Move cursor right within current pattern
            const newCursorPath = [...cursorPath];
            newCursorPath[newCursorPath.length - 1] = currentPosition + 1;
            setCursorPath(newCursorPath);
          }
        } else if (cursorPath.length > 1) {
          // At the end of a nested pattern, move back to parent after the nested pattern
          const parentPath = cursorPath.slice(0, -1);
          const parentPosition = parentPath[parentPath.length - 1];

          // Create new path at parent level, after the nested pattern
          const newCursorPath = [...parentPath];
          newCursorPath[newCursorPath.length - 1] = parentPosition + 1;
          setCursorPath(newCursorPath);
        }

        if (e.metaKey) {
          // Update selection
          setSelectedSymbols((prev) => [...prev, [...cursorPath]]);
        }
      } else if (e.key === "Escape") {
        // Move cursor up to parent pattern if in a nested pattern
        if (cursorPath.length > 1) {
          const newCursorPath = cursorPath.slice(0, -1);
          setCursorPath(newCursorPath);
        }
      }
    },
    [pattern, lockedMode, selectedNodes, selectedSymbols, cursorPath],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // Render the main pattern with cursor
  const renderPattern = () => {
    const elements = [];

    // Iterate through the pattern and render each atom with cursor in the right place
    for (let i = 0; i <= pattern.length; i++) {
      // Check if cursor should be at this position
      const isCursorHere = cursorPath.length === 1 && cursorPath[0] === i;

      // Render cursor if needed
      if (isCursorHere) {
        elements.push(
          <div
            key={`cursor-${i}`}
            className="animate-pulse bg-teal-500"
            style={{
              width: "1px",
              height: `${BASE_WIDTH * 1}px`,
              marginLeft: "0px",
              marginRight: "0px",
            }}
          />,
        );
      }

      // If we're at the end, don't try to render an atom
      if (i === pattern.length) continue;

      // Get the atom at this position
      const atom = pattern[i];
      const atomPath = [i];

      // Check if this atom is selected
      const isSelected = selectedSymbols.some(
        (path) =>
          path.length === atomPath.length && path.every((val, idx) => val === atomPath[idx]),
      );

      // Use specialized rendering for atoms based on type
      if (atom === 0) {
        // Dot
        elements.push(
          <div
            key={atomPath.join("-")}
            className={`border-2 rounded-full ${!isSelected ? "border-white" : "bg-white"}`}
            style={{
              width: `${BASE_WIDTH}px`,
              height: `${BASE_WIDTH}px`,
              boxSizing: "border-box",
              margin: "1px",
            }}
            data-path={atomPath.join("-")}
          />,
        );
      } else if (atom === 1) {
        // Dash
        elements.push(
          <div
            key={atomPath.join("-")}
            className={`border-2 rounded-full ${!isSelected ? "border-white" : "bg-white"}`}
            style={{
              width: `${BASE_WIDTH * DASH_SIZE}px`,
              height: `${BASE_WIDTH}px`,
              boxSizing: "border-box",
              margin: "1px",
            }}
            data-path={atomPath.join("-")}
          />,
        );
      } else if (typeof atom === "object" && "pattern" in atom) {
        // Nested pattern
        elements.push(renderNestedPattern(atom, atomPath, isSelected));
      }
    }

    return elements;
  };

  let count = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === 0) {
      count++;
    } else if (pattern[i] === 1) {
      count += 2;
    } else if ("size" in pattern[i]) count += pattern[i].size;
  }

  return (
    <div className="bg-black text-white w-full h-full flex flex-wrap items-center p-2 gap-0 relative">
      {renderPattern()}
      <div className="right-1 bottom-1 absolute">{count}</div>
      {/* Debug display for development */}
      {/*
      <div className="absolute bottom-0 left-0 text-xs text-white p-1 bg-gray-800 opacity-50">
        Cursor: {JSON.stringify(debugInfo.cursorPath)},
        Selected: {JSON.stringify(debugInfo.selectedSymbols.map(p => p.join(',')))}
      </div>
      */}
    </div>
  );
};
