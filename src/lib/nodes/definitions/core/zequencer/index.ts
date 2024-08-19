import { zequencer } from "./core";
import type { API } from "@/lib/nodes/context";
import { zequencer_ui } from "./ui";
import { zequencer_info } from "./info";

export const zequencer_index: API = {
  "zequencer.core": zequencer,
  "zequencer.ui": zequencer_ui,
  "zequencer.info": zequencer_info,
};
