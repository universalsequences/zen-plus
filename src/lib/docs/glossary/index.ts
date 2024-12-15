export interface GlossaryItem {
  name: string;
  definition: string | string[];
}

export const glossary: {
  [x: string]: GlossaryItem;
} = {
  node: {
    name: "node",
    definition: [
      "A unit of computation that performs a specific task.",
      "They can either be a [[message box]], [[number box]], or [[object]]",
      "Each node has a set of [[attributes]] that can be set in the [[inspector]].",
    ],
  },
  object: {
    name: "object",
    definition: [
      "A basic programming element in Zen+ that performs a specific function (defined by it's [[operator]]), such as mathematical operations, audio processing, or data manipulation.",
      "Objects appear as boxes in the patcher window and can be connected to other objects, via [[cables]], to create more complex behaviors.",
      "Examples include [[+]] for addition, [[metro]] for timing, and [[speakers~]] for sending audio to speakers.",
      "Objects can be created by double clicking the patch editor, or by right clicking the editor and selecting 'new object'.",
      "Typing into an empty object chooses the [[operator]] for the object, which are grouped by [[operator type]].",
    ],
  },
  operator: {
    name: "operator",
    definition: [
      "An operator is a function that performs a specific task on the data it receives. It defines the behavior of an [[object]].",
      "An operator is linked to an [[object]] and can be changed by double clicking the [[object]] and typing in a new operator, and pressing enter.",
      "Operators are the basic building blocks of Zen+.",
      "Examples include [[+]] for addition, [[metro]] for timing, and [[speakers~]] for sending audio to speakers.",
      "Operators are grouped by [[operator type]].",
    ],
  },
  "operator type": {
    name: "operator type",
    definition: [
      "The type grouping for an [[operator]], acting as a namespace for an [[operator]].",
      'For example, the "+" operator acts differently when typed to the [[gl]] operator type vs the [[core]] operator type.',
      "This is closely related to [[patch type]].",
      "There are four operator types: [[core]], [[gl]], [[zen]], and [[audio]].",
      "[[object]]s of each operator type are colored differently, to help you identify them.",
    ],
  },
  "patch type": {
    name: "patch type",
    definition: [
      "The type of a [[subpatch]], which determines the set of [[operators]] available to the subpatch.",
      "This is closely related to [[operator type]], but is used to describe the type of a [[subpatch]].",
      "There are four patch types: [[core]], [[gl]], [[zen]], and [[audio]].",
      'For subpatches of type [[zen]], the subpatch will recompile whenever the subpatch is edited and "complete".',
      "The [[base patch]] has [[core]] as its [[patch type]], by default.",
      "You can only use [[zen]] operators in [[zen]] subpatches, however other [[operator type]]s can be used in other [[patch type]]s.",
    ],
  },
  "base patch": {
    name: "base patch",
    definition: [
      "The root [[patch]] that contains all the [[subpatch]]s.",
      "The base patch is the patch that is loaded when Zen+ is opened.",
    ],
  },
  zen: {
    name: "zen",
    definition: [
      "One of the four [[patch type]]s and [[operator type]]s.",
      "A [[subpatch]] of [[patch type]] zen [[patch type]] compiles into an [[AudioWorklet]].",
      "The zen [[operator]] set of [[object]]s (only available in zen subpatches) are used to create custom audio processing nodes, using a very similar framework as Max-MSP's gen~",
      "These [[operator]]s mostly deal with math and buffers, to specify the exact, sample-accurate behavior of the audio processing.",
      "It is the default [[patch type]] for [[subpatch]]s",
    ],
  },
  audio: {
    name: "audio",
    definition: [
      "An [[operator type]] and [[patch type]] that outputs and receives audio.",
      "Examples include [[speakers~]] and [[live.meter~]].",
    ],
  },
  gl: {
    name: "gl",
    definition: [
      "An [[operator type]] and [[patch type]] that are used to create custom WebGL [[shader]]s.",
      "Examples include [[vec4]] and [[canvas]].",
      "When a set of [[object]] nodes are connected to a [[canvas]] object, the [[shader]] is compiled and displayed in the [[canvas]]",
    ],
  },
  attribute: {
    name: "attribute",
    definition: [
      "An attribute is a property of an [[object]] that can be set in the [[inspector]].",
      "Attributes are used to control the behavior of an [[object]].",
      "Examples include [[min]] and [[max]] for [[number box]]es, and [[rate]] for [[metro]]s.",
    ],
  },
  attributes: {
    name: "attributes",
    definition: [
      "Additionally values that are used to control the behavior of an [[object]].",
      "Different [[object]]s and [[node]]s can have different attributes.",
      "Examples include [[min]] and [[max]] for [[number box]]es, and [[rate]] for [[metro]]s.",
    ],
  },
  inspector: {
    name: "inspector",
    definition: [
      "The inspector is a panel that appears when an [[object]] is selected in the patcher window.",
      "It allows you to set the [[attributes]] of an [[object]].",
      'To view the inspector, select an [[object]] and press "tab"',
    ],
  },
  "message box": {
    name: "message box",
    definition: [
      "A special type of [[node]] in Zen+ that stores and sends data when triggered.",
      "Represented by a rectangular box with rounded corners, message boxes can contain numbers, symbols, or lists that are sent to other objects.",
      "They can be triggered by clicking them directly or receiving input from other objects. Message boxes are also commonly used to initialize parameters and store preset values.",
      "Can be edited during runtime by double-clicking and typing new values.",
      "When the left [[inlet]] receives a [[bang]], it sends the [[message]] stored in the message box out through it's [[outlet]].",
      "The right [[inlet]] receives messages, and stores them in the message box, replacing the previous value.",
    ],
  },
  "number box": {
    name: "number box",
    definition: [
      "A [[node]] that displays and allows editing of numerical values.",
      "It can both receive numbers from other objects and output numbers when edited.",
      "Number boxes can be adjusted by clicking and dragging up or down, typing a value directly, or receiving values from other objects. They're commonly used for displaying and controlling parameters like volume levels, frequencies, or delay times.",
      "Number boxes can be configured to display integers or floating-point numbers and can have their min and max values set in the [[inspector]].",
    ],
  },
  subpatch: {
    name: "subpatch",
    definition: [
      "A patch is embedded within a larger patch.",
      "Subpatches can be used to organize code, create reusable modules, or encapsulate functionality for easier management and reuse.",
      "They can be created by selecting a section of code and right-clicking, selecting 'encapsulated' in the dropdown menu.",
      "They help reduce visual clutter and make patches more modular and reusable.",
      "Subpatches can have their own inlets and outlets to communicate with the parent patch, and they can be opened for editing by double-clicking.",
    ],
  },
  inlet: {
    name: "inlet",
    definition: [
      "Connection points at the top of an [[object]] that receive incoming data or signals",
      "The leftmost (hot) inlet typically triggers the [[object]]'s [[operator]].",
      "Additional (cold) inlets often set parameters without triggering immediate output",
      "Different inlets can serve different functions for the same [[object]]",
      "When typing the name of an [[object]], you can type the default value of the inlets, following the [[operator]] name.",
      'For example, typing "metro 25" will create a [[metro]] object with a rate of 25 bpm.',
    ],
  },
  canvas: {
    name: "canvas",
    definition: [
      "A special type of [[object]] that displays a [[shader]].",
      'The [[canvas]] object can be resized, and the frame rate can be set in the [[inspector]], with the "fps" [[attribute]].',
      "Its [[inlet]] takes in a [[AST]] created by a connected network of [[gl]] [[objects]].",
    ],
  },
  outlet: {
    name: "outlet",
    definition: [
      "Connection points at the bottom of an object that send data or signals to other objects",
      "Objects can have multiple outlets that output different types of information",
      "Used to send processed data, status messages, or other outputs to connected objects",
      "Essential for creating data flow between objects in a patch",
    ],
  },
  cables: {
    name: "cables",
    definition: [
      "Patch chords that connect [[nodes]] together, allowing [[messages]] or signals to flow between them",
      "Appear in different colors depending on the type of data they carry",
      "Gray for control data, yellow/gray for audio signals (~), purple of shader ASTs, and mint for zen ASTs",
      "Creates the visual and functional connections between objects in a patch",
    ],
  },
  bang: {
    name: "bang",
    definition: [
      "A fundamental message type in Max that triggers events or actions",
      "Represented by both a message type and an object ([[b]] or [[button]])",
      "Essentially a signal that tells an object to 'do its thing'",
      "Used to trigger outputs, perform operations, or initiate stored actions",
    ],
  },
  message: {
    name: "message",
    definition: [
      "The basic unit of data communication in Max that can be sent between objects",
      "Can take various forms including numbers, symbols, lists, or [[bang]]",
      "Different message types trigger different behaviors in receiving objects",
      "Can contain variables using the '$' symbol for dynamic data handling",
      "Message timing and order is determined by Max's scheduling system and the hot/cold inlet behavior of objects",
    ],
  },
  AST: {
    name: "AST",
    definition: [
      "Abstract Syntax Tree",
      "A tree representation of the source code's syntactic structure or code graph.",
      "These are used to compile to final low-level code, such as [[AudioWorklet]]s or [[shader]]s",
      "Subpatches of type zen are compiled into an AST that is then compiled into an [[AudioWorklet]]",
      "Subpatches of type gl are compiled into an AST that is then compiled into a [[shader]]",
    ],
  },
  AudioWorklet: {
    name: "AudioWorklet",
    definition: [
      "An AudioWorklet is a JavaScript module that runs in a separate thread from the main thread",
      "It is used to process audio data in real-time",
      "AudioWorklets are used to create custom audio processing algorithms",
    ],
  },
  shader: {
    name: "shader",
    definition: [
      "A shader is a program that runs on the GPU",
      "Shaders are used to create custom visualizers.",
      "In Zen+, shaders are created by connecting [[gl]] [[object]]s to a [[canvas]] object.",
    ],
  },
  "Digital Signal Processing": {
    name: "Digital Signal Processing",
    definition: [
      "Digital Signal Processing (or DSP) refers to the processing of digital signals, such as audio or video, using algorithms and mathematical operations.",
      "In Zen+, DSP is used to process audio signals using [[zen]] [[object]]s.",
    ],
  },
  ramp: {
    name: "ramp",
    definition: [
      "A sawtooth-like waveform that goes from [0,1].",
      "Can be used as a clock signal, oscillator, LFO and more.",
      "The [[phasor]] operator generates pure ramps.",
    ],
  },
  pulse: {
    name: "pulse",
    definition: [
      "A signal that is 1 for a single sample, and 0 for the rest of the samples in a buffer.",
      "Can be used to trigger other events in a [[zen]] [[subpatch]].",
    ],
  },
  feedback: {
    name: "feedback",
    definition: [
      "Feedback is a technique of routing the output of some process back into the input of that same process.",
      "In Zen+, feedback is created using the [[history]] operator.",
    ],
  },
  trig: {
    name: "trig",
    definition: [
      "A signal of mostly zeroes, with sparse spikes of 1.",
      "Can be used to trigger other events in a [[zen]] [[subpatch]].",
    ],
  },
  "normalized signal": {
    name: "Normalized Signal",
    definition: [
      "A signal that is scaled to the range [0,1].",
      "This is the default range for most [[zen]] [[object]]s.",
    ],
  },
  "unit shaping": {
    name: "Unit Shaping",
    definition: [
      "Unit Shaping is the process of transforming a [[normalized signal]] into a different form.",
    ],
  },
};
