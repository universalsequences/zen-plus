import { doc } from "./doc";
import { MutableValue } from "./MutableValue";
import { ObjectNode, Message } from "../../types";
import { useMidi } from "@/contexts/MidiContext";

// Common MIDI commands
const MIDI_COMMANDS = {
  NOTE_OFF: 0x80,         // Note Off: 128
  NOTE_ON: 0x90,          // Note On: 144
  POLYPHONIC_AFTERTOUCH: 0xA0, // Polyphonic Aftertouch: 160
  CONTROL_CHANGE: 0xB0,   // Control Change: 176
  PROGRAM_CHANGE: 0xC0,   // Program Change: 192
  CHANNEL_AFTERTOUCH: 0xD0, // Channel Aftertouch: 208
  PITCH_BEND: 0xE0,       // Pitch Bend: 224
  SYSTEM: 0xF0            // System messages: 240
};

doc("midiout", {
  description: "send MIDI messages to MIDI output devices",
  numberOfInlets: 5,
  numberOfOutlets: 1,
  inletNames: ["bang/note number", "velocity", "channel", "command", "output device"],
  outletNames: ["success/failure"]
});

export const midiout = (node: ObjectNode) => {
  node.needsMainThread = true;
  
  // Set up default attributes and state
  if (!node.custom) {
    node.custom = new MutableValue(node);
    node.custom.value = {
      outputDevice: 0,    // Default to first output device
      channel: 1,         // MIDI channels are 1-16
      command: MIDI_COMMANDS.NOTE_ON,
      noteNumber: 60,     // Middle C
      velocity: 100       // Moderate velocity
    };
  }

  // Create attribute options for the MIDI commands
  if (!node.attributeOptions.command) {
    node.attributeOptions.command = [
      "note_off", "note_on", "polyphonic_aftertouch", 
      "control_change", "program_change", "channel_aftertouch", "pitch_bend"
    ];
  }

  // Setup attributes with defaults if they don't exist
  if (!node.attributes.outputDevice) {
    node.attributes.outputDevice = 0;
  }
  if (!node.attributes.channel) {
    node.attributes.channel = 1;
  }
  if (!node.attributes.command) {
    node.attributes.command = "note_on";
  }

  // Define attribute callbacks
  if (!node.attributeCallbacks.command) {
    node.attributeCallbacks.command = (value) => {
      const commandMap: { [key: string]: number } = {
        "note_off": MIDI_COMMANDS.NOTE_OFF,
        "note_on": MIDI_COMMANDS.NOTE_ON,
        "polyphonic_aftertouch": MIDI_COMMANDS.POLYPHONIC_AFTERTOUCH,
        "control_change": MIDI_COMMANDS.CONTROL_CHANGE,
        "program_change": MIDI_COMMANDS.PROGRAM_CHANGE,
        "channel_aftertouch": MIDI_COMMANDS.CHANNEL_AFTERTOUCH,
        "pitch_bend": MIDI_COMMANDS.PITCH_BEND
      };
      
      if (typeof value === "string" && value in commandMap) {
        if (node.custom) {
          node.custom.value = {
            ...node.custom.value,
            command: commandMap[value]
          };
        }
      }
    };
  }

  if (!node.attributeCallbacks.channel) {
    node.attributeCallbacks.channel = (value) => {
      if (typeof value === "number") {
        // Ensure channel is between 1-16
        const channel = Math.max(1, Math.min(16, value));
        
        if (node.custom) {
          node.custom.value = {
            ...node.custom.value,
            channel
          };
        }
      }
    };
  }

  if (!node.attributeCallbacks.outputDevice) {
    node.attributeCallbacks.outputDevice = (value) => {
      if (typeof value === "number" && node.custom) {
        node.custom.value = {
          ...node.custom.value,
          outputDevice: value
        };
      }
    };
  }

  // This function will be called from the main thread
  node.onNewValue = (message: Message) => {
    if (typeof message !== "object" || message === null) return;
    
    try {
      // Get access to MIDI context
      const midiContext = useMidi();
      
      if (!midiContext.midiAccess) {
        console.error("No MIDI access available");
        return;
      }
      
      // Get the stored values
      const stored = node.custom?.value as any;
      
      // Get the output device index
      const outputIdx = stored.outputDevice || 0;
      
      // Get the MIDI output
      const outputs = Array.from(midiContext.midiOutputs);
      
      if (outputs.length === 0) {
        console.error("No MIDI output devices available");
        return;
      }
      
      // Make sure the output index is in range
      const safeOutputIdx = Math.min(outputIdx, outputs.length - 1);
      const output = outputs[safeOutputIdx];
      
      if (!output) {
        console.error("MIDI output not found");
        return;
      }
      
      // Get command, channel, note, and velocity values
      const command = stored.command || MIDI_COMMANDS.NOTE_ON;
      const channel = Math.max(1, Math.min(16, stored.channel || 1)) - 1; // Convert 1-16 to 0-15
      const noteNumber = stored.noteNumber || 60;
      const velocity = stored.velocity || 100;
      
      // Create the MIDI message based on the command
      let midiData: number[];
      
      switch (command) {
        case MIDI_COMMANDS.NOTE_ON:
        case MIDI_COMMANDS.NOTE_OFF:
          midiData = [command + channel, noteNumber, velocity];
          break;
        
        case MIDI_COMMANDS.CONTROL_CHANGE:
          midiData = [command + channel, noteNumber, velocity];
          break;
        
        case MIDI_COMMANDS.PROGRAM_CHANGE:
        case MIDI_COMMANDS.CHANNEL_AFTERTOUCH:
          midiData = [command + channel, noteNumber];
          break;
        
        case MIDI_COMMANDS.PITCH_BEND:
          // Note: Pitch bend uses two bytes for the value
          const msb = (velocity >> 7) & 0x7F;
          const lsb = velocity & 0x7F;
          midiData = [command + channel, lsb, msb];
          break;
        
        default:
          midiData = [command + channel, noteNumber, velocity];
      }
      
      // Send the MIDI message
      output.send(midiData);
      
      return;
    } catch (error) {
      console.error("Error sending MIDI message:", error);
      return;
    }
  };

  return (message: Message) => {
    if (node.custom) {
      const state = node.custom.value as any;
      
      // Handle different inlet messages
      if (message !== undefined) {
        if (typeof message === "number") {
          // Inlet 0: Note number (or bang if 0)
          if (message === 0) {
            // Send current state as a bang
            node.onNewValue?.(node.custom.value);
          } else {
            // Set note number and send
            state.noteNumber = Math.min(127, Math.max(0, Math.floor(message)));
            node.custom.value = {...state};
          }
        }
      }
      
      return [true]; // Return success
    }
    
    return [false]; // Return failure
  };
};

// Function to handle messages on different inlets
export const midioutInlet = (node: ObjectNode, inlet: number) => {
  return (message: Message) => {
    if (node.custom && typeof message === "number") {
      const state = node.custom.value as any;
      
      switch (inlet) {
        case 1: // Velocity
          state.velocity = Math.min(127, Math.max(0, Math.floor(message)));
          break;
        
        case 2: // Channel
          state.channel = Math.min(16, Math.max(1, Math.floor(message)));
          break;
        
        case 3: // Command
          // Commands can be specified as numbers matching the MIDI spec
          const commandValues = Object.values(MIDI_COMMANDS);
          // Find the closest command value
          for (const val of commandValues) {
            if (message >= val && message < val + 16) {
              state.command = val;
              break;
            }
          }
          break;
        
        case 4: // Output device
          state.outputDevice = Math.max(0, Math.floor(message));
          break;
      }
      
      node.custom.value = {...state};
    }
    
    return [];
  };
};