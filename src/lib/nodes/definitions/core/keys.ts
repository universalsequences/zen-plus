import { doc } from "./doc";
import type { ObjectNode, Lazy, Message, NodeFunction } from "../../types";

doc("key.down", {
  numberOfInlets: 2,
  numberOfOutlets: (x) => x,
  inletNames: ["none", "key"],
  description: "outputs bang if key matches",
  defaultValue: "",
});

export const keydown: NodeFunction = (node: ObjectNode, key: Lazy) => {
  node.needsLoad = true;
  node.needsMainThread = true;
  node.skipCompilation = true;
  window?.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return; // Ignore the event if it's from an input field or text box
    }
    const _key = key() === "space" ? " " : key();
    if (_key === "") {
      node.send(node.outlets[0], e.key);
      return;
    }
    if (e.key === _key) {
      e.preventDefault();
      node.send(node.outlets[0], "bang");
    }
  });

  return (_message: Message) => {
    return [];
  };
};

doc("keyboard.transpose", {
  numberOfInlets: 1,
  numberOfOutlets: 1,
  inletNames: ["control"],
  outletNames: ["frequency"],
  description: "Converts keyboard input to frequency values using Ableton-style keyboard mapping",
});

export const keyboardTranspose: NodeFunction = (node: ObjectNode) => {
  node.needsLoad = true;
  node.needsMainThread = true;
  node.skipCompilation = true;

  // Track current octave
  let currentOctave = 0;

  // Define the keyboard mapping (Ableton-style)
  const keyboardMap: Record<string, number> = {
    a: 0, // C
    w: 1, // C#
    s: 2, // D
    e: 3, // D#
    d: 4, // E
    f: 5, // F
    t: 6, // F#
    g: 7, // G
    y: 8, // G#
    h: 9, // A
    u: 10, // A#
    j: 11, // B
    k: 12, // C (next octave)
    o: 13, // C# (next octave)
    l: 14, // D (next octave)
  };

  // Define message types
  type NoteMessage = {
    type: "noteon" | "noteoff";
    semitone: number;
    live?: boolean;
  };

  // We'll no longer need the frequency conversion

  // Track keys that are currently pressed
  const pressedKeys = new Set<string>();
  const keyToSemitone = new Map<string, number>();

  // Add event listener for keydown events
  window?.addEventListener("keydown", (e: KeyboardEvent) => {
    // Ignore if the event came from an input field or text box
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // Check if key is already pressed (prevents repeat triggers)
    if (pressedKeys.has(e.key)) {
      e.preventDefault();
      return;
    }

    // Add to pressed keys
    pressedKeys.add(e.key);

    // Handle octave shifts
    if (e.key === "z") {
      currentOctave = Math.max(currentOctave - 1, -2); // Limit lowest octave to -2
      e.preventDefault();
      return;
    }

    if (e.key === "x") {
      currentOctave = Math.min(currentOctave + 1, 8); // Limit highest octave to 8
      e.preventDefault();
      return;
    }

    // Check if the key pressed is in our mapping
    if (keyboardMap.hasOwnProperty(e.key)) {
      e.preventDefault();

      // Calculate the semitone value with octave shift
      const semitone = keyboardMap[e.key] + currentOctave * 12; // +48 to start from C4 (middle C)
      keyToSemitone.set(e.key, semitone);

      // Create noteon message
      const noteMessage: NoteMessage = {
        type: "noteon",
        semitone: semitone,
        live: true,
      };

      // Send the note message to the outlet
      node.send(node.outlets[0], noteMessage);
    }
  });

  // Add event listener for keyup events
  window?.addEventListener("keyup", (e: KeyboardEvent) => {
    // Ignore if the event came from an input field or text box
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // Remove from pressed keys set
    pressedKeys.delete(e.key);

    // Check if the key released is in our mapping
    if (keyboardMap.hasOwnProperty(e.key) && keyToSemitone.has(e.key)) {
      // Calculate the semitone value with octave shift
      const semitone = keyToSemitone.get(e.key) as number;

      // Create noteoff message
      const noteMessage: NoteMessage = {
        type: "noteoff",
        semitone: semitone,
        live: true,
      };

      // Send the note off message to the outlet
      node.send(node.outlets[0], noteMessage);
    }
  });

  // Handle inlet messages (if any)
  return (message: Message) => {
    // Process any incoming messages if needed
    return [];
  };
};
