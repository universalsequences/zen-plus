import Matrix from './Matrix';
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

interface NodeProps {
    objectNode: ObjectNode;
}

type ComponentIndex = {
    [x: string]: React.ComponentType<NodeProps>
}

export const index: ComponentIndex = {
    matrix: Matrix,
    comment: Comment,
    "html": HTMLViewer,
    "number~": NumberTilde,
    "scope~": ScopeTilde,
    "buffer": Audio,
    "attrui": AttrUI,
    "umenu": UMenu,
    "canvas": SVGCanvas,
    "slider": Slider,
    "knob": Knob
};
