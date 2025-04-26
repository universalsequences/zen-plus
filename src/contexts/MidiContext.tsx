import React, { createContext, useEffect, useState, useContext } from "react";

interface IMidiContext {
  midiAccess: WebMidi.MIDIAccess | null;
  midiOutputs: WebMidi.MIDIOutput[];
  getMidiOutputByName: (name: string) => WebMidi.MIDIOutput | undefined;
}

const MidiContext = createContext<IMidiContext | undefined>(undefined);

export const useMidi = (): IMidiContext => {
  const context = useContext(MidiContext);
  if (!context) throw new Error("useMidi must be used within MidiProvider");
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const MidiProvider: React.FC<Props> = ({ children }) => {
  const [midiAccess, setMidiAccess] = useState<WebMidi.MIDIAccess | null>(null);
  const [midiOutputs, setMidiOutputs] = useState<WebMidi.MIDIOutput[]>([]);

  useEffect(() => {
    // Request MIDI access from the browser
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess()
        .then((access) => {
          setMidiAccess(access);
          
          // Get the list of outputs and update state
          const outputs: WebMidi.MIDIOutput[] = [];
          access.outputs.forEach((output) => {
            outputs.push(output);
          });
          setMidiOutputs(outputs);
          
          // Set up listener for device connection/disconnection
          access.onstatechange = (e) => {
            // Update the outputs list when devices change
            const updatedOutputs: WebMidi.MIDIOutput[] = [];
            access.outputs.forEach((output) => {
              updatedOutputs.push(output);
            });
            setMidiOutputs(updatedOutputs);
          };
        })
        .catch((error) => {
          console.error("Failed to access MIDI devices:", error);
        });
    } else {
      console.warn("WebMIDI is not supported in this browser");
    }
  }, []);

  const getMidiOutputByName = (name: string): WebMidi.MIDIOutput | undefined => {
    return midiOutputs.find(output => output.name === name);
  };

  return (
    <MidiContext.Provider
      value={{
        midiAccess,
        midiOutputs,
        getMidiOutputByName
      }}
    >
      {children}
    </MidiContext.Provider>
  );
};