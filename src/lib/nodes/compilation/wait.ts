import { Patch } from "../types";
import { sleep } from "./onCompile";

export const waitForBuffers = async (patch: Patch) => {
  let buffers = patch.getAllNodes().filter((x) => x.name === "buffer");

  if (buffers.length === 0) {
    return;
  }

  for (let i = 0; i < 2000; i++) {
    if (buffers.some((x) => !x.buffer)) {
      await sleep(25);
    }
  }
};
