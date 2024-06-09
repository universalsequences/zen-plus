import { ObjectNode, Message, Lazy } from "../../types";
import { doc } from "./doc";

doc("currenttime", {
  numberOfOutlets: 1,
  numberOfInlets: 1,
  description: "outputs current time",
});

export const currenttime = (_node: ObjectNode) => {
  return (_x: Message) => [_node.patch.audioContext.currentTime];
};

doc("converttime", {
  numberOfOutlets: 1,
  numberOfInlets: 2,
  inletNames: ["time (1,2,4,8,16,32)", "bpm"],
  description: "converts relative time to seconds",
});

export const converttime = (_node: ObjectNode, bpm: Lazy) => {
  return (note: Message) => {
    let beatsPerNote: number;

    switch (note as number) {
      case 1:
        beatsPerNote = 4; // A whole note is 4 beats
        break;
      case 2:
        beatsPerNote = 2; // A half note is 2 beats
        break;
      case 4:
        beatsPerNote = 1; // A quarter note is 1 beat
        break;
      case 8:
        beatsPerNote = 0.5; // An eighth note is 0.5 beats
        break;
      case 16:
        beatsPerNote = 0.25; // A sixteenth note is 0.25 beats
        break;
      default:
        beatsPerNote = 0.125; // A thirty-second note is 0.125 beats
        break;
    }

    return [beatsPerNote * (60 / (bpm() as number))]; // Calculate the time in seconds
  };
};
