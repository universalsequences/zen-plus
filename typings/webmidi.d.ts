declare namespace WebMidi {
  interface MIDIOptions {
    sysex?: boolean;
    software?: boolean;
  }

  interface MIDIAccess extends EventTarget {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => any) | null;
    sysexEnabled: boolean;
  }

  interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
  }

  interface MIDIMessageEvent extends Event {
    data: Uint8Array;
  }

  interface MIDIPort extends EventTarget {
    id: string;
    manufacturer?: string;
    name?: string;
    type: MIDIPortType;
    version?: string;
    state: MIDIPortDeviceState;
    connection: MIDIPortConnectionState;
    onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => any) | null;
    open(): Promise<MIDIPort>;
    close(): Promise<MIDIPort>;
  }

  interface MIDIOutput extends MIDIPort {
    send(data: number[] | Uint8Array, timestamp?: number): void;
    clear(): void;
  }

  interface MIDIInput extends MIDIPort {
    onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
  }

  type MIDIPortType = "input" | "output";
  type MIDIPortDeviceState = "disconnected" | "connected";
  type MIDIPortConnectionState = "open" | "closed" | "pending";

  interface MIDIInputMap {
    entries(): IterableIterator<[string, MIDIInput]>;
    forEach(callback: (input: MIDIInput, key: string, map: MIDIInputMap) => void): void;
    get(id: string): MIDIInput | undefined;
    has(id: string): boolean;
    keys(): IterableIterator<string>;
    size: number;
    values(): IterableIterator<MIDIInput>;
    [key: string]: MIDIInput;
  }

  interface MIDIOutputMap {
    entries(): IterableIterator<[string, MIDIOutput]>;
    forEach(callback: (output: MIDIOutput, key: string, map: MIDIOutputMap) => void): void;
    get(id: string): MIDIOutput | undefined;
    has(id: string): boolean;
    keys(): IterableIterator<string>;
    size: number;
    values(): IterableIterator<MIDIOutput>;
    [key: string]: MIDIOutput;
  }
}

interface Navigator {
  requestMIDIAccess(options?: WebMidi.MIDIOptions): Promise<WebMidi.MIDIAccess>;
}