// This component has been replaced by a canvas-based implementation in Matrix.tsx.
// This file is kept for backwards compatibility but is no longer used.

import React from "react";
import { Position } from "./Matrix";
import { ObjectNode } from "@/lib/nodes/types";

const MatrixCell: React.FC<{
  selectedField: string;
  min: number;
  unit: string;
  isDisabled: boolean;
  showValue: boolean;
  ux: string;
  fillColor: string;
  max: number;
  cornerRadius: string;
  width: number;
  height: number;
  toggle: (row: number, col: number, value?: number) => void;
  type: string;
  lockedMode: boolean;
  objectNode: ObjectNode;
  idx: number;
  _idx: number;
  row: number;
  col: number;
  editing: React.MutableRefObject<Position | null>;
}> = () => {
  return null; // This component is no longer used
};

export default React.memo(MatrixCell);