import Matrix from './Matrix';
import Color from './Color';
import SignalReceive from './SignalReceive';
import Button from './Button';
import Preset from './Preset';
import FunctionUX from './FunctionUX';
import Divider from './Divider';
import GLCanvas from './GLCanvas';
import SVGCanvas from './SVGCanvas';
import Slider from './Slider';
import Knob from './Knob';
import UMenu from './UMenu';
import AttrUI from './AttrUI';
import React from 'react';
import NumberTilde from './NumberTilde';
import ScopeTilde from './ScopeTilde';
import { ObjectNode } from '@/lib/nodes/types';
import Audio from './Audio';
import Comment from './Comment';
import HTMLViewer from './HTMLViewer';
import WasmViewer from './WasmViewer';

export interface NodeProps {
    objectNode: ObjectNode;
}

type ComponentIndex = {
    [x: string]: React.ComponentType<NodeProps>
}

export const index: ComponentIndex = {
    wasmviewer: WasmViewer,
    matrix: Matrix,
    comment: Comment,
    "html": HTMLViewer,
    "number~": NumberTilde,
    "scope~": ScopeTilde,
    "buffer": Audio,
    "attrui": AttrUI,
    "umenu": UMenu,
    "canvas": GLCanvas,
    "slider": Slider,
    "knob": Knob,
    "divider": Divider,
    "function": FunctionUX,
    "button": Button,
    "preset": Preset,
    "color": Color
};

export const optionalIndex: ComponentIndex = {
    'receive~': SignalReceive
};

