import { doc } from "../doc";

doc("onSave", {
  description: "hook triggered before saving",
  numberOfInlets: 0,
  numberOfOutlets: 1,
});
export const onSave = () => {
  return () => ["bang"];
};
