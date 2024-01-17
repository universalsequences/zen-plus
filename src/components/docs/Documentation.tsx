import React from 'react';
import { DoubleArrowDownIcon } from '@radix-ui/react-icons'
import ExamplePatch from './ExamplePatch';
import Image from 'next/image';
import API from './API';
import * as zen from '@/lib/nodes/definitions/zen/doc';
import * as gl from '@/lib/nodes/definitions/gl/doc';

const White: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="text-white font-bold">{children}</span>;
const P: React.FC<{ className?: string, children: React.ReactNode }> = ({ children, className = "" }) => <p className={"my-4 " + className}>{children}</p>;

const Documentation = () => {
    return (
        <div className="pl-40 pt-10 overflow-scroll max-h-screen w-full text-zinc-200">
            <div className="w-3/4">
                <P>
                    <White>zen+</White> is a visual programming environment.
                </P>
                <P>
                    A <White>Patch</White> represents a self contained work. Within a <White>Patch</White>, there are <White>Nodes</White> and <White>Cables</White>.
                </P>
                <P>

                    There are several sets of <White>Nodes</White> for different tasks like <White>Audio</White> and <White>Visuals</White> (GLSL). Nodes are color coded by their type (<span className="text-purple-500">GLSL</span>,  <span className="text-zinc-600">Audio</span>, <span className="text-zinc-400">Number</span> or <span className="text-blue-600">Core</span>)
                </P>
                <div className="flex">
                    <P className="w-96">
                        <p>
                            A <White>Node</White> can be thought as a function, representing an operation to data coming in through its <White>inlets</White>, outputing its results through its <White>outlets</White>.
                        </p>
                        <p className="mt-10 text-xs">
                            For example, the patch to the right represents a phasor going from 0-1 at 432 HZ (i.e. a sawtooth wave), transforming into a sine wave going
                            at the same rate.
                        </p>
                    </P>

                    <Image alt="Nodes Connecting" src="/doc-nodes-1.png" width={100} height={100} />
                </div>
                <div className="flex">
                    <P className="w-64">
                        To create a <White>Node</White> in the editor, simply double click anywhere on the patch and type into the node and press enter.
                    </P>
                    <P className="ml-10 w-64">
                        To connect two <White>Nodes</White>, click on an <White>inlet</White> (the little circle at the bottom of a node), and drag the cable to another nodes <White>outlet</White> (the little circle at the top of a node).
                    </P>
                </div>
                Try it out below, by double clicking and typing <White>cycle</White> to create a <White>cycle</White> node and then double clicking and typing any number (followed by enter)
                <div className="w-full h-64">
                    <ExamplePatch />
                </div>

                <div className="flex mt-5">
                    <P className="w-96">
                        <p>
                            Each <White>inlet</White> can receive inputs from one node, providing inputs to the desired operation. Nodes just
                            containing numbers simply output that number to other nodes.
                        </p>
                        <p className="mt-10 text-xs">
                            For example, this one represents a phasor (sawtooth) and cycle (sine wave) mixed evenly 50% (noted by the 0.5)
                            at the same rate.
                        </p>
                    </P>
                    <Image alt="Nodes Connecting" src="/doc-nodes-2.png" width={250} height={100} />
                </div>
                <P>
                    zen+ is heavily inspired by Max-MSP, and its audio processing operators are very similar to the gen~ operators in Max.
                </P>
                <div className="text-3xl my-4">
                    the compiler
                </div>
                <P>
                    Its important to note that <White>Nodes</White> <span className="italic">do not</span> process literal audio signal. Instead, they form mathematical expressions that compile into efficient audio graphs. Looked at another way, a <White>zen+ patch</White> is simply code represented visually. More on this later.
                </P>
                <P className="mr-2">
                    <p>
                        Compilation is kicked off once a graph is connected to a <span className="font-bold">out 1</span> node and/or any part of the patch is edited.
                    </p>
                    <p className="mt-5">
                        When this happens, a new <White>AudioWorklet</White> is generated (within milliseconds) and connected to your speakers.
                        The generated <White>AudioWorklet</White> is highly optimized, and has the option to compiling C code (via WebAssembly).
                    </p>
                </P>

                <div className="text-3xl my-4">
                    exporting onchain
                </div>
                <div className="flex items-start">
                    <div className="flex flex-col">
                        <P>
                            Since these nodes can be represented as code, you can export your work into tiny packages that can be run anywhere on the Web. Simply execute the code with the zen npm package (a small ~36KB package).
                        </P>
                        <P>
                            A large motivation for creating the <White>zen</White> programming language, and the <White>zen+</White> environment, was to be able to place complex audio synthesis programs onto cheap Ethereum L2 networks.
                        </P>
                        <P>
                            To achieve this, <White>zen+</White> generates a minified string representation of the code and provides a one-click <White>publish onchain</White> button. This deploys your project as a dynamic HTML NFT on <White><a href="https://zora.co">Zora Network</a></White>.
                        </P>
                        <P>
                            Works published this way are deployed as a standalone <White>ERC721</White> contract-- owned by the user-- where each minted token can be a unique variation of the project. The contracts themselves are custom <White>Zora Drop Contracts</White>.
                        </P>
                        <P>
                            All <White>param</White> nodes marked with the "@onchain 1" attribute will be dynamically generated per token, within the defined ranges of that <White>param</White> node (the min/max attributes).
                        </P>
                    </div>
                    <div className="my-auto ml-5">
                        <Image className="border border-zinc-700 mx-auto " alt="Nodes Connecting" src="/doc-nodes-1.png" width={100} height={100} />
                        <DoubleArrowDownIcon className="mx-auto my-5" />
                        <Image className="border border-zinc-700 " alt="Nodes Connecting" src="/zen-code.png" width={350} height={400} />
                        <div className="text-xs">
                            an example snippet of (unminified) deployable zen code.
                        </div>
                    </div>
                </div>
                <div className="text-3xl my-4">visuals</div>
                <div className="flex items-start">
                    <div className="mr-2">
                        <P>
                            <White>zen+</White> also contains a limited set of GLSL nodes for creating visuals (via shaders).
                        </P>
                        <P>
                            The <White>canvas</White> node is the endpoint for a GLSL graph, displaying the shader program represented by the inputted nodes.
                        </P>
                        <P>
                            <White>uniform</White> nodes let you control values inside the visual dynamically, with either UX controls or values coming in (from the audio graph)
                        </P>
                        <P>
                            Since GLSL is typechecked, <White>zen+</White> will warn you if a specific node fails any typechecks.
                        </P>
                    </div>
                    <Image alt="Nodes Connecting" src="/zen-gl.png" width={200} height={200} />
                </div>
                <P>
                    For works published onchain, any named <White>message</White> nodes will pass its current value-- from the audio graph-- to any GLSL <White>uniform</White> nodes of the same name. This connects audio to visuals tightly, as values are emitted every 20ms.
                </P>

                <div className="text-3xl my-4">
                    List of All Operators
                </div>
                <div className="text-3xl my-4">
                    audio
                </div>
                <p>
                    <API api={zen.api} />
                </p>
                <div className="text-3xl my-4">
                    GLSL
                </div>
                <p>
                    <API api={gl.api} />
                </p>
            </div>
        </div >
    );
};

export default Documentation;
