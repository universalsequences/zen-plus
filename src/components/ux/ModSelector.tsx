import { useLocked } from "@/contexts/LockedContext";
import { usePosition } from "@/contexts/PositionContext";
import { useValue } from "@/contexts/ValueContext";
import { getRootPatch } from "@/lib/nodes/traverse";
import { MessageObject, ObjectNode } from "@/lib/nodes/types";
import { useCallback, useEffect, useState } from "react";

interface Option {
  value: {
    id: string;
    outlet: number;
  };
  label: string;
}
export const ModSelector: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    const root = getRootPatch(objectNode.patch);
    const allNodes = root.getAllNodes();
    const slots = allNodes.filter((x) => x.attributes.slotview);
    const otherSlots = allNodes.flatMap((x) => (x.name === "slots~" ? x.slots || x : []));
    slots.push(...otherSlots);

    setOptions(
      slots.flatMap((slot) => {
        const name = slot.subpatch?.name || slot.name;
        return slot.outlets.map((outlet, idx) => {
          const outletName = outlet.name;
          return {
            value: {
              id: slot.id,
              outlet: idx,
            },
            label: `${name} -> out ${idx + 1} ${outletName || ""}`,
          };
        });
      }),
    );
  }, []);

  const { value } = useValue();

  useEffect(() => {
    if (value || objectNode.saveData) {
      const { source, outlet } = (value || objectNode.saveData) as MessageObject;
      const key = `${source},${outlet}`;
      setSelectedOption(key);
    }
  }, [value, objectNode.saveData]);
  const { lockedMode } = useLocked();
  usePosition();
  const { width, height } = objectNode.size || { width: 72, height: 18 };

  let [selectedOption, setSelectedOption] = useState<string | null>(null);
  const onChangeOption = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      console.log("selected option =", e.target.value);
      setSelectedOption(e.target.value);
      if (e.target.value === "none") {
        objectNode.receive(objectNode.inlets[0], "clear");
        return;
      }
      const splitted = e.target.value.split(",");
      const id = splitted[0];
      const outlet = parseInt(splitted[1]);
      objectNode.receive(objectNode.inlets[0], {
        id,
        outlet,
      });
    },
    [setSelectedOption],
  );

  return (
    <div
      onMouseDown={(e: any) => {
        if (lockedMode) {
          e.stopPropagation();
        }
      }}
      className={"bg-zinc-900 " + (lockedMode ? "" : " pointer-events-none")}
    >
      <select
        style={{ fontSize: height * 0.55, width, height }}
        className="text-white bg-zinc-900 outline-none pl-1 mr-1"
        placeholder="none"
        value={(selectedOption as string) || "none"}
        onChange={onChangeOption}
      >
        <option value="none">None</option>
        {options.map((x, i) => (
          <option key={i} value={`${x.value.id},${x.value.outlet}`}>
            {x.label}
          </option>
        ))}
      </select>
    </div>
  );
};
