import Matrix from "./Matrix";
import Lisp from "./Lisp";
import { Waveform } from "./Waveform";
import { XYControlComponent } from "./XYControlComponent";
import { ZequencerInfo } from "./zequencer/ZequencerInfo";
import { ASTViewer } from "./ASTViewer";
import ButtonOptions from "./ButtonOptions";
import Color from "./Color";
import OscilloscopeTilde from "./OscilloscopeTilde";
import SignalReceive from "./SignalReceive";
import { Slots } from "./Slots";
import Button from "./Button";
import Preset from "./Preset";
import PresetView from "./PresetView";
import FunctionUX from "./FunctionUX";
import Divider from "./Divider";
import FilterGraph from "./FilterGraph";
import FilterGraphSVG from "./FilterGraphSVG";
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
import { ModSelector } from "./ModSelector";
import { Panel } from "./Panel";
import { InstructionsPerformance } from "./InstructionsPerformance";
import TabObject from "./TabObject";
import { ETEditor } from "./ETEDitor";

export type NodeProps =
  | {
      objectNode: ObjectNode;
    }
  | {
      objectNode: ObjectNode;
      fullscreen: boolean;
      setFullScreen: (x: boolean) => void;
    };

type ComponentIndex = {
  [x: string]: React.ComponentType<NodeProps>;
};

export const index: ComponentIndex = {
  wasmviewer: WasmViewer,
  "xy.control": XYControlComponent,
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
  filtergraph: FilterGraphSVG, // Using SVG version instead of canvas
  function: FunctionUX,
  button: Button,
  preset: Preset,
  "preset.view": PresetView,
  color: Color,
  "live.meter~": LiveMeter,
  lisp: Lisp as React.ComponentType<NodeProps>,
  js: Lisp as React.ComponentType<NodeProps>,
  buttonoptions: ButtonOptions,
  "zequencer.info": ZequencerInfo,
  modselector: ModSelector,
  panel: Panel,
  "instructions.performance": InstructionsPerformance,
  tab: TabObject,
  "et.editor": ETEditor,
};

export const optionalIndex: ComponentIndex = {
  "receive~": SignalReceive,
};
