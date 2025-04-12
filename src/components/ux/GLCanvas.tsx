import Shader from "@/components/shader/Shader";
import { useSelection } from "@/contexts/SelectionContext";
import { useBuffer } from "@/contexts/BufferContext";
import { usePosition } from "@/contexts/PositionContext";
import { RenderJob } from "@/lib/gl/zen";
import { ObjectNode, Message } from "@/lib/nodes/types";
import { useMessage } from "@/contexts/MessageContext";
import { useEffect, useState } from "react";
import { BufferType } from "@/lib/tiling/types";
import { usePatches } from "@/contexts/PatchesContext";

const GLCanvas: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { messages } = useMessage();
  const { currentBuffer, containerRef } = useBuffer();
  const { getAllTilesWithBuffer, selectedBuffer } = usePatches();
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [shouldRender, setShouldRender] = useState<boolean>(true);
  usePosition();
  useSelection();

  // Check if this shader should be rendered (avoid duplicates)
  useEffect(() => {
    // If current buffer is not Object type, we need to check if there's already
    // a buffer of type Object displaying this same object node
    if (currentBuffer && currentBuffer.type !== BufferType.Object) {
      // Check all object buffers to see if any are displaying this same object node
      const objectBuffers = getAllTilesWithBuffer("").filter(
        (tile) =>
          tile.buffer?.type === BufferType.Object && tile.buffer.objectNode?.id === objectNode.id,
      );

      // If there are object buffers with this object node, don't render this one
      setShouldRender(objectBuffers.length === 0);
    } else {
      // If current buffer is Object type or not defined, allow rendering
      setShouldRender(true);
    }
  }, [currentBuffer, objectNode.id, getAllTilesWithBuffer, selectedBuffer]);

  // Check container size when component mounts and when containerRef changes
  useEffect(() => {
    if (currentBuffer?.type === BufferType.Object && containerRef?.current) {
      const updateSize = () => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          setContainerSize({
            width: clientWidth,
            height: clientHeight,
          });
        }
      };

      updateSize();

      // Set up resize observer to track container size changes
      const resizeObserver = new ResizeObserver(updateSize);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      // Add window resize listener to handle overall window changes
      window.addEventListener("resize", updateSize);

      // Handle container resize mutations (for when tiles are resized)
      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            (mutation.attributeName === "style" || mutation.attributeName === "class")
          ) {
            updateSize();
          }
        });
      });

      if (containerRef.current) {
        // Observe both the container and its parent
        mutationObserver.observe(containerRef.current, {
          attributes: true,
          attributeFilter: ["style", "class"],
        });

        if (containerRef.current.parentElement) {
          mutationObserver.observe(containerRef.current.parentElement, {
            attributes: true,
            attributeFilter: ["style", "class"],
          });
        }
      }

      return () => {
        if (containerRef.current) {
          resizeObserver.disconnect();
          mutationObserver.disconnect();
        }
        window.removeEventListener("resize", updateSize);
      };
    }
  }, [containerRef, currentBuffer, selectedBuffer]);

  const message: Message | undefined = messages[objectNode.id];

  // Early return if we shouldn't render this shader
  if (!shouldRender) {
    return <div className="w-12 h-12" />;
  }

  if (
    objectNode.renderJob ||
    (message &&
      objectNode.size &&
      (message as RenderJob).fragment &&
      (message as RenderJob).fragmentContext)
  ) {
    const graph: RenderJob = (message as RenderJob) || objectNode.renderJob;

    // Use container size if available and if buffer is of type Object
    const width =
      currentBuffer?.type === BufferType.Object && containerSize
        ? containerSize.width
        : objectNode.size?.width || 300;

    const height =
      currentBuffer?.type === BufferType.Object && containerSize
        ? containerSize.height
        : objectNode.size?.height || 300;

    return (
      <Shader
        objectNode={objectNode}
        fps={objectNode.attributes["fps"] as number}
        width={width}
        height={height}
        zenGraph={graph}
      />
    );
  } else {
    return <div className="w-12 h-12" />;
  }
};

export default GLCanvas;
