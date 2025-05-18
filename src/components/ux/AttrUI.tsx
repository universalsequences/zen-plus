import React, { useEffect, useCallback, useState, useRef } from "react";
import { useLocked } from "@/contexts/LockedContext";
import AttrUIValue from "./AttrUIValue";
import { useSelection } from "@/contexts/SelectionContext";
import { SubPatch, ObjectNode, Message } from "@/lib/nodes/types";
import { getNodesControllableByAttriUI } from "../../lib/nodes/utils/getNodesControllableByAttriUI";

interface Option {
  label: string;
  value: ObjectNode | null;
}

const AttrUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  let [options, setOptions] = useState<Option[]>([]);
  let { lockedMode } = useLocked();
  const lockedModeRef = useRef<boolean>(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    lockedModeRef.current = lockedMode;
  }, [lockedMode]);

  // Monitor container size to adapt menu width
  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.clientWidth);
        }
      };

      // Initial measurement
      updateDimensions();

      // Setup resize observer to handle container size changes
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
        resizeObserver.disconnect();
      };
    }
  }, []);

  let [selectedOption, setSelectedOption] = useState<string | null>(
    (objectNode.text.split(" ")[1] as string) || null,
  );
  let parsed = parseFloat(objectNode.text.split(" ")[2]);

  // Get the mode from attributes or default to "number"
  const mode =
    (objectNode.attributes.mode as
      | "number"
      | "slider-horizontal"
      | "slider-vertical"
      | "checkbox"
      | "knob") || "number";

  // Determine if we should use vertical layout based on the mode
  const isVerticalLayout =
    mode === "knob" || mode === "slider-horizontal" || mode === "slider-vertical";

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = useCallback(() => {
    const paramNodes = getNodesControllableByAttriUI(objectNode);
    let options: Option[] = [];
    for (let node of paramNodes) {
      let paramName = (node as ObjectNode).arguments[0] as string;
      if (!options.some((x) => x.label === paramName)) {
        options.push({
          label: paramName,
          value: node as ObjectNode,
        });
      }
    }
    setOptions([{ label: "none", value: null }, ...options] as Option[]);
  }, [setOptions]);

  const onChangeOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (e.target.value === "none") {
        objectNode.text = "attrui";
        setSelectedOption(null);
        return;
      }
      setSelectedOption(e.target.value);
      let text = objectNode.text.split(" ");
      text[1] = e.target.value;

      objectNode.text = text.join(" ");
      objectNode.controllingParamNode =
        options.find((x) => x.label === e.target.value)?.value || undefined;

      objectNode.updateWorkerState();
    },
    [setSelectedOption, options],
  );

  let found = options.find((x) => x.label === selectedOption) as Option | undefined;
  let node: ObjectNode | null = found ? found.value : null;

  return React.useMemo(() => {
    // Calculate adaptive menu width based on container size
    // For small containers, menu should use less space to give room for the control
    const calculateMenuWidth = () => {
      if (!isVerticalLayout) {
        // Only for horizontal layout
        if (containerWidth < 250) {
          // For smaller nodes, scale menu width proportionally
          // Minimum 50px, and maximum 60% of container width
          const calculatedWidth = Math.max(50, Math.min(containerWidth * 0.4, 128));
          return `${calculatedWidth}px`;
        }
        // Default width for larger containers
        return "128px";
      }
      return "100%"; // Vertical layout always uses full width
    };

    // Setup size constraints based on mode
    let containerStyle: React.CSSProperties = {};
    let controlStyle: React.CSSProperties = {};
    let selectorStyle: React.CSSProperties = {};

    if (isVerticalLayout) {
      // Vertical layout - control on top, selector on bottom
      // Use minimal heights for all components
      const selectorHeight = 15; // Small selector height
      const minControlHeight = 5; // Minimal control height
      const minHeight = selectorHeight + minControlHeight;

      containerStyle = {
        minHeight: minHeight,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      };

      controlStyle = {
        flex: 1,
        width: "100%",
        minHeight: minControlHeight,
      };

      selectorStyle = {
        width: "100%",
        height: `${selectorHeight}px`,
        fontSize: containerWidth < 150 ? "10px" : "10px", // Smaller font for compact display
      };
    } else {
      // Horizontal layout - selector on left, control on right
      containerStyle = {
        minHeight: "10px",
        display: "flex",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      };

      // Calculate menu width based on container width
      const menuWidth = calculateMenuWidth();

      selectorStyle = {
        maxWidth: menuWidth,
        width: menuWidth,
        fontSize: containerWidth < 150 ? "8px" : "10px", // Smaller font for compact display
      };

      controlStyle = {
        flex: 1,
        borderLeft: "1px solid #8d8787",
        minWidth: "5px", // Allow control to be very small
        display: "flex",
        alignItems: "center", // Center number editor vertically
      };
    }

    // Apply opacity for disabled control
    if (!selectedOption) {
      controlStyle.opacity = "0.2";
      controlStyle.pointerEvents = "none";
    }

    return (
      <div
        ref={containerRef}
        onMouseDown={(e: any) => {
          if (lockedMode) {
            e.stopPropagation();
          }
        }}
        onClick={(e: any) => {
          loadOptions();
          if (lockedMode) {
            e.stopPropagation();
          }
        }}
        className={`${lockedMode ? "" : "pointer-events-none"} bg-zinc-900 w-full h-full`}
        style={containerStyle}
      >
        {/* For vertical layout, the AttrUIValue comes first */}
        {isVerticalLayout && (
          <div style={controlStyle}>
            <AttrUIValue
              max={node && node.attributes ? (node.attributes.max as number) || 1 : 1}
              node={objectNode}
              lockedModeRef={lockedModeRef}
              min={node && node.attributes ? (node.attributes.min as number) || 0 : 0}
            />
          </div>
        )}

        {/* Menu selector */}
        <select
          className="text-white bg-zinc-900 outline-none pl-1"
          style={selectorStyle}
          placeholder="none"
          value={(selectedOption as string) || "none"}
          onChange={onChangeOption}
        >
          {options.map((x) => (
            <option key={x.label} value={x.label}>
              {x.label}
            </option>
          ))}
        </select>

        {/* For horizontal layout, the AttrUIValue comes after the menu */}
        {!isVerticalLayout && (
          <div style={controlStyle}>
            <AttrUIValue
              max={node && node.attributes ? (node.attributes.max as number) || 1 : 1}
              node={objectNode}
              lockedModeRef={lockedModeRef}
              min={node && node.attributes ? (node.attributes.min as number) || 0 : 0}
            />
          </div>
        )}
      </div>
    );
  }, [
    objectNode.attributes.min,
    lockedMode,
    selectedOption,
    objectNode.attributes.max,
    options,
    mode,
    isVerticalLayout,
    containerWidth, // Add containerWidth to dependencies
  ]);
};

export default AttrUI;
