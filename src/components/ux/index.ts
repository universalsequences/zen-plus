import Matrix from "./Matrix";
import { Waveform } from "./Waveform";
import { ASTViewer } from "./ASTViewer";
import ButtonOptions from "./ButtonOptions";
import Color from "./Color";
import OscilloscopeTilde from "./OscilloscopeTilde";
import SignalReceive from "./SignalReceive";
import { Slots } from "./Slots";
import Button from "./Button";
import Preset from "./Preset";
import FunctionUX from "./FunctionUX";
import Divider from "./Divider";
import GLCanvas from "./GLCanvas";
import SVGCanvas from "./SVGCanvas";
import Slider from "./Slider";
import Knob from "./Knob";
import UMenu from "./UMenu";
import AttrUI from "./AttrUI";
import type React from "react";
import NumberTilde from "./NumberTilde";
import ScopeTilde from "./ScopeTilde";
import type { ObjectNode } from "@/lib/nodes/types";
import Audio from "./Audio";
import Comment from "./Comment";
import HTMLViewer from "./HTMLViewer";
import WasmViewer from "./WasmViewer";
import { LiveMeter } from "./LiveMeter";
import { Toggle } from "./Toggle";
import { ZequencerUI } from "./zequencer/ZequencerUI";

export interface NodeProps {
  objectNode: ObjectNode;
}

type ComponentIndex = {
  [x: string]: React.ComponentType<NodeProps>;
};

export const index: ComponentIndex = {
  wasmviewer: WasmViewer,
  matrix: Matrix,
  comment: Comment,
  html: HTMLViewer,
  toggle: Toggle,
  "number~": NumberTilde,
  "scope~": ScopeTilde,
  "oscilloscope~": OscilloscopeTilde,
  "slots~": Slots,
  "zequencer.ui": ZequencerUI,
  ast: ASTViewer,
  buffer: Audio,
  attrui: AttrUI,
  umenu: UMenu,
  canvas: GLCanvas,
  slider: Slider,
  knob: Knob,
  divider: Divider,
  waveform: Waveform,
  function: FunctionUX,
  button: Button,
  preset: Preset,
  color: Color,
  "live.meter~": LiveMeter,
  buttonoptions: ButtonOptions,
};

export const optionalIndex: ComponentIndex = {
  "receive~": SignalReceive,
};
