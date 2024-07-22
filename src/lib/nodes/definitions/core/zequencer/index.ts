import { zequencer } from "./core";
import type { API } from "@/lib/nodes/context";
import { zequencer_ui } from "./ui";

export const zequencer_index: API = {
  "zequencer.core": zequencer,
  "zequencer.ui": zequencer_ui,
};
