import { ObjectNode } from "@/lib/nodes/types";
import React, { useEffect, useState } from "react";
import SlotView from "../SlotView";
import { useLocked } from "@/contexts/LockedContext";
import { useValue } from "@/contexts/ValueContext";

export const Slots: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const [dragging, setDragging] = useState<ObjectNode | null>(null);
  const [slots, setSlots] = useState(objectNode.slots!);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

  useValue();

  useEffect(() => {
    if (objectNode.slots) {
      setSlots(objectNode.slots);
    }
  }, [objectNode.slots]);

  const { lockedMode } = useLocked();

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      className="flex flex-col w-full border-zinc-700"
    >
      {slots?.map((x, index) => (
        <div
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setDragOverItemIndex(index);
          }}
          onDragStart={(e: React.DragEvent<HTMLDivElement>) => setDragging(x)}
          onDragLeave={(e: React.DragEvent<HTMLDivElement>) => setDragOverItemIndex(null)}
          onDrop={(e: React.DragEvent<HTMLDivElement>) => {
            if (dragging) {
              let draggedItemIndex = slots.indexOf(dragging);
              const draggedItem = slots[draggedItemIndex];
              const remainingItems = slots.filter((_, idx) => idx !== draggedItemIndex);
              const reorderedItems = [
                ...remainingItems.slice(0, index),
                draggedItem,
                ...remainingItems.slice(index),
              ];
              setSlots(reorderedItems);
              objectNode.slots = reorderedItems;
              objectNode.receive(objectNode.inlets[0], "reconnect");
              setDragging(null);
            }
          }}
          key={`${x.id}_${index}`}
          style={{
            borderTop:
              dragging && dragOverItemIndex === index ? "1px white solid" : "1px solid transparent",
          }}
          className="bg-zinc-920 mb-0.5 "
          draggable={lockedMode ? "true" : "false"}
        >
          <SlotView objectNode={x} />
        </div>
      ))}
    </div>
  );
};
