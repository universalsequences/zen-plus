import type {
  Lazy,
  Message,
  MessageObject,
  ObjectNode,
} from "@/lib/nodes/types";
import { createWorklet } from "../audio/index";
import { doc } from "./doc";

doc("interval", {
  description: "sends bang in a timed interval",
  numberOfInlets: 1,
  numberOfOutlets: 1,
  inletNames: ["interval time ms"],
});

export const interval = (node: ObjectNode) => {
  let timer: NodeJS.Timeout;
  const tick = () => {
    node.send(node.outlets[0], "bang");
  };
  return (time: Message) => {
    if (timer) {
      clearInterval(timer);
    }
    timer = setInterval(tick, typeof time === "number" ? time : 100);
    return [];
  };
};

doc("metro", {
  description:
    "outputs timed messages to a bpm. sending 1 to 1st inlet plays and 0 stops",
  numberOfInlets: 2,
  inletNames: ["message", "bpm"],
  numberOfOutlets: 1,
});

export const metro = (node: ObjectNode, bpm: Lazy) => {
  node.needsLoad = true;

  if (!node.audioNode) {
    createWorklet(node, "/MetroWorklet.js", "metro-processor").then(() => {
      const worklet = node.audioNode;
      if (worklet) {
        (worklet as AudioWorkletNode).port.onmessage = (e: MessageEvent) => {
          const data: any = e.data;
          const time = data.time as number;
          const stepNumber = data.stepNumber;
          node.send(node.outlets[0], { time, stepNumber } as any);
        };

        const gain = node.patch.audioContext.createGain();
        gain.gain.value = 0;
        gain.connect(node.patch.audioContext.destination);

        if (typeof bpm() === "number") {
          updateBPM(worklet as AudioWorkletNode, bpm() as number);
        }
      }
    });
  }

  const updateBPM = (worklet: AudioWorkletNode, bpm: number) => {
    worklet.port.postMessage({
      type: "bpm",
      value: bpm,
    });
  };

  let isPlaying = true;
  // create an audioworklet for metro
  return (message: Message) => {
    // update bpm and restart if necessary
    let worklet = node.audioNode as AudioWorkletNode;
    if (message === 1) {
      worklet?.port.postMessage({ type: "play" });
      isPlaying = false;
    } else if (message === 0) {
      // stop
      worklet?.port.postMessage({ type: "stop" });
      isPlaying = true;
    }

    if (node.audioNode && typeof bpm() === "number") {
      updateBPM(worklet, bpm() as number);
    }
    return [];
  };
};

doc("schedule", {
  description:
    "schedules objects with time fields to be triggered with lookahead",
  inletNames: ["event", "lookahead (seconds)"],
  outletNames: ["event"],
  isHot: false,
  numberOfInlets: 2,
  numberOfOutlets: 1,
});

export const schedule = (objectNode: ObjectNode, lookahead: Lazy) => {
  let events: MessageObject[] = [];

  const toDelete: MessageObject[] = [];
  const onTick = () => {
    const _lookahead = lookahead() as number;
    const now = objectNode.patch.audioContext.currentTime;
    for (const event of events) {
      if ((event.time as number) <= now) {
        toDelete.push(event);
        continue;
      }
      if ((event.time as number) - now <= _lookahead) {
        objectNode.send(objectNode.outlets[0], event);
        toDelete.push(event);
      }
    }
    if (toDelete.length > 0) {
      events = events.filter((x) => !toDelete.includes(x));
      toDelete.length = 0;
    }
  };

  setInterval(onTick, 2);
  return (event: Message) => {
    if (event === "clear") {
      events.length = 0;
      return [];
    }
    if (typeof event !== "object") {
      return [];
    }
    events.push(event as MessageObject);
    return [];
  };
};
