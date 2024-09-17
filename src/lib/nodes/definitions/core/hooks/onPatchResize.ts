import { doc } from "../doc";

doc("onPatchResize", {
  description: "hook triggered when patch resizes",
  numberOfInlets: 0,
  numberOfOutlets: 1,
});
export const onPatchResize = () => {
  return () => ["bang"];
};
