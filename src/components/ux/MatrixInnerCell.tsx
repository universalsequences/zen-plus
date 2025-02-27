// This component has been replaced by a canvas-based implementation in Matrix.tsx.
// This file is kept for backwards compatibility but is no longer used.

import React from "react";
import { ObjectNode, MessageObject } from "@/lib/nodes/types";

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
  isBar: boolean;
  objectNode: ObjectNode;
  isLine: boolean;
}> = () => {
  return null; // This component is no longer used
};

export default React.memo(MatrixInnerCell);