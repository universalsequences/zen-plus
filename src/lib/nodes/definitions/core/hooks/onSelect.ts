import { doc } from "../doc";

doc("onPatchSelect", {
  description: "triggered when patch is selected",
  numberOfOutlets: 1,
  numberOfInlets: 1,
});

export const onPatchSelect = () => {
  return () => {
    return ["bang"];
  };
};