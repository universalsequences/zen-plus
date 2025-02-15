import type { ObjectNode, Message } from "@/lib/nodes/types";
import { doc } from "./doc";

doc("counter", {
  description: "allows counting",
  numberOfInlets: 1,
  numberOfOutlets: 2,
});

export const counter = (node: ObjectNode) => {
  node.branching = true;
  let current = 0;
  let direction = 1; // 1 for up, -1 for down
  let hasCarried = false; // Will be true once a carry has been triggered at a boundary

  // Set default attributes
  if (node.attributes.inc === undefined) {
    node.attributes.inc = 1;
  }
  if (node.attributes.dir === undefined) {
    node.attributes.dir = "up";
  }
  node.attributeOptions.dir = ["up", "down", "up-down"];
  if (node.attributes.min === undefined) {
    node.attributes.min = 0;
  }
  if (node.attributes.max === undefined) {
    node.attributes.max = 16;
  }

  // Helper: update the counting direction based on current value and bounds.
  const updateDirection = () => {
    if (node.attributes.dir === "up-down") {
      if (current >= (node.attributes.max as number)) {
        direction = -1;
      } else if (current <= (node.attributes.min as number)) {
        direction = 1;
      }
    } else {
      direction = node.attributes.dir === "up" ? 1 : -1;
    }
  };

  // Update current value, handling boundaries and carry triggering.
  // A carry is triggered only when we cross a boundary and haven't already carried.
  const updateValue = (newValue: number, checkCarry = true): boolean => {
    const min = node.attributes.min as number;
    const max = node.attributes.max as number;

    // Determine if this update would hit (or cross) a boundary.
    const willHitBoundary =
      (newValue >= max && direction > 0) || (newValue <= min && direction < 0);

    // Decide whether to trigger the carry:
    // Only trigger if we're hitting the boundary and haven't already triggered a carry.
    let carryTriggered = false;
    if (checkCarry && willHitBoundary && !hasCarried) {
      carryTriggered = true;
      hasCarried = true;
    }

    // Update current value based on boundary conditions.
    if (willHitBoundary) {
      if (newValue >= max && direction > 0) {
        current = node.attributes.dir !== "up-down" ? min : max;
      } else if (newValue <= min && direction < 0) {
        current = node.attributes.dir !== "up-down" ? max : min;
      }
    } else {
      // If we’re not hitting a boundary, update the value normally
      // and reset the carry flag so a future boundary crossing can trigger a new carry.
      current = newValue;
      hasCarried = false;
    }

    updateDirection();
    return carryTriggered;
  };

  return (msg: Message) => {
    const inc = node.attributes.inc as number;
    let carryFlag = false;

    if (msg === "bang") {
      // Regular counting: increment (or decrement) based on direction.
      carryFlag = updateValue(current + direction * inc);
    } else if (typeof msg === "number") {
      // Direct number input sets the current value without checking for a carry.
      updateValue(msg, false);
      // Reset the carry flag when setting a specific value.
      hasCarried = false;
    } else if (msg === "inc") {
      // Manual increment.
      carryFlag = updateValue(current + inc);
    } else if (msg === "dec") {
      // Manual decrement.
      carryFlag = updateValue(current - inc);
    }

    // Return the current value and a "bang" if a carry was triggered.
    const x = [current, carryFlag ? "bang" : undefined];
    console.log(x);
    return x;
  };
};
