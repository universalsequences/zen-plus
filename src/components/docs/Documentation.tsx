import React from "react";
import { DoubleArrowDownIcon } from "@radix-ui/react-icons";
import ExamplePatch from "./ExamplePatch";
import Image from "next/image";
import API from "./API";
import * as zen from "@/lib/nodes/definitions/zen/doc";
import * as gl from "@/lib/nodes/definitions/gl/doc";
import * as audio from "@/lib/nodes/definitions/audio/doc";
import * as core from "@/lib/nodes/definitions/core/doc";

const White: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-white font-bold">{children}</span>
);
const P: React.FC<{ className?: string; children: React.ReactNode }> = ({
  children,
  className = "",
}) => <p className={"my-4 " + className}>{children}</p>;

const Core = () => {
  return <span className="table context-type-2 px-2 py-0.5 rounded-full items-start">core</span>;
};

const AudioNode = () => {
  return (
    <div className="table context-type-1 px-2 py-1 text-black rounded-full items-start">core</div>
  );
};

const Documentation = () => {
  return (
    <div className="pl-40 pt-10 overflow-scroll max-h-screen w-full text-zinc-200">
      <div className="w-3/4">
        <P>
          <White>zen+</White> is a visual programming environment.
        </P>
        <P>
          Instead of programming with text, we code by <White>patching</White>.
        </P>
        <P>
          Patches are made up of <White>nodes</White> which are connected together with{" "}
          <White>Cables</White>.
        </P>
        <P>
          <h2 className="text-xl font-semibold mb-4">Nodes</h2>
          There are 2 types of <White>nodes</White>:
          <ol>
            <li>
              1. <White>message nodes</White> represent a piece of data, called a{" "}
              <White>message</White> (a string, number, list etc)
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <White>message nodes</White> are used to pass messages between nodes.
                </li>
                <li>
                  <White>number nodes</White> are used to output number messages.
                </li>
                <li className="italic">
                  Right-click the editor to create either type of message node.
                </li>
              </ul>
            </li>
            <li>
              2. <White>object nodes</White> represents an operation.
            </li>
          </ol>
        </P>
        <P>
          <div className="space-y-6">
            <div className="border rounded-lg border-zinc-700 p-6 bg-zinc-900 shadow-sm w-2/3">
              <h3 className="text-lg font-semibold mb-4">Creating an Object Node</h3>
              <p className="mb-2">
                To create an empty <White>object node</White>, double click the patch editor. You'll
                see a list of available <White>operators</White>, grouped by{" "}
                <White>operator type</White>.
              </p>
            </div>
          </div>
        </P>
        <P>
          There are 4 <White>operator types</White>:
          <ul>
            <li className="my-2 flex gap-2 items-start">
              <div className="w-16 items-start">
                <div className="table context-type-2 px-2 py-1 rounded-full items-start">core</div>
              </div>
              <div className="italic">processing messages</div>
            </li>
            <li className="my-2 flex gap-2">
              <div className="w-16 items-start">
                <div className="table context-type-1 px-2 py-1 rounded-full text-black">audio</div>
              </div>
              <div className="italic">processing audio</div>
            </li>
            <li className="my-2 flex gap-2">
              <div className="w-16 items-start">
                <div className="table bg-zinc-800 px-2 py-1 rounded-full">zen</div>
              </div>
              <div className="italic">creating optimized audio nodes</div>
            </li>
            <li className="my-2 flex gap-2">
              <div className="w-16 items-start">
                <div className="table context-type-6 px-2 py-1 rounded-full">gl</div>
              </div>
              <div className="italic">creating shaders</div>
            </li>
          </ul>
        </P>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Editing Modes</h2>
          <P>In order to start patching, you must first understand two editing modes.</P>
          <div className="gap-4 flex">
            <div className="border rounded-lg border-zinc-700 p-6 bg-zinc-900 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Edit Mode (Unlocked)</h3>
              <p className="mb-2">
                This is where you build and modify your patches. In Edit Mode, you can:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Create new nodes</li>
                <li>Connect nodes with cables</li>
                <li>Move nodes around</li>
                <li>Select and organize nodes</li>
                <li>Delete nodes and connections</li>
                <li>Edit node names (by double clicking an object node)</li>
              </ul>
            </div>

            <div className="border rounded-lg border-zinc-700 p-6 bg-zinc-900 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Performance Mode (Locked)</h3>
              <p className="mb-2">
                This is where you interact with and use your patch. In Performance Mode, you can:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Adjust values in number boxes</li>
                <li>Click message boxes to trigger events</li>
                <li>Interact with matrices and controls</li>
                <li>Run and test your patch</li>
                <li>Focus on using the patch without accidentally modifying its structure</li>
              </ul>
            </div>
          </div>

          <p className="mt-6">
            Switch between modes using <White>⌘-E </White>to lock/unlock the patch editor. You can
            also click the lock icon at the right of the bottom toolbar.
          </p>
          <p className="mt-4">
            This clear distinction between building (Edit Mode) and using (Performance Mode) helps
            prevent accidental modifications while performing or testing your patches.
          </p>
        </div>
        <P>
          The following patch demonstrates these two modes. Click the lock icon to switch between
          them. While in <White>Performance Mode</White>, you can click the <White>toggle</White>{" "}
          object (the node with the x) to turn on the <White>metro</White> object.
        </P>
        <div className="w-full h-64">
          <ExamplePatch
            commit="patches/4ca73a2b-d8d6-4259-a759-5d9606006ca7"
            docId="aN7tLdgtRy8JvhMEts37"
          />
        </div>
        <P>
          <h2 className="text-xl font-semibold mb-4">Cables</h2>
          <P>Cables are used to connect nodes together.</P>
          <div className="flex gap-4">
            <div className="w-72">
              An <White>object node</White> can be thought as a function, representing an operation
              to data coming in through its <White>inlets</White>, outputting its results through
              its <White>outlets</White>.
            </div>
            <div className="w-72">
              To connect two <White>Nodes</White>, click on an <White>outlet</White> (the little
              circle at the bottom of a node), and drag the cable to another nodes{" "}
              <White>inlet</White> (the little circle at the top of a node).
            </div>
          </div>
          <P className="italic my-4 flex">
            <Core />{" "}
            <span className="ml-2">
              When an <White>object node</White> receives messages from all its{" "}
              <White>inlets</White>, it outputs its result to its <White>outlets</White>.
            </span>
          </P>
        </P>
        <div className="flex">
          <P className="w-64">
            To create a <White>Node</White> in the editor, simply double click anywhere on the patch
            and type into the node and press enter.
          </P>
          <P className="ml-10 w-64">
            To connect two <White>Nodes</White>, click on an <White>inlet</White> (the little circle
            at the bottom of a node), and drag the cable to another nodes <White>outlet</White> (the
            little circle at the top of a node).
          </P>
        </div>
        Try it out below, by double clicking and typing <White>button</White> to create a{" "}
        <White>button</White> node and then creating another <White>button</White> node, and
        connecting them.
        <div className="flex mt-5">
          <P className="w-96">
            <p>
              Each <White>inlet</White> can receive inputs from one node, providing inputs to the
              desired operation. Nodes just containing numbers simply output that number to other
              nodes.
            </p>
            <p className="mt-10 text-xs">
              For example, this one represents a phasor (sawtooth) and cycle (sine wave) mixed
              evenly 50% (noted by the 0.5) at the same rate.
            </p>
          </P>
          <Image alt="Nodes Connecting" src="/doc-nodes-2.png" width={250} height={100} />
        </div>
        <P>
          zen+ is heavily inspired by Max-MSP, and its audio processing operators are very similar
          to the gen~ operators in Max.
        </P>
        <div className="text-3xl my-4">the compiler</div>
        <P>
          Its important to note that <White>Nodes</White> <span className="italic">do not</span>{" "}
          process literal audio signal. Instead, they form mathematical expressions that compile
          into efficient audio graphs. Looked at another way, a <White>zen+ patch</White> is simply
          code represented visually. More on this later.
        </P>
        <P className="mr-2">
          <p>
            Compilation is kicked off once a graph is connected to a{" "}
            <span className="font-bold">out 1</span> node and/or any part of the patch is edited.
          </p>
          <p className="mt-5">
            When this happens, a new <White>AudioWorklet</White> is generated (within milliseconds)
            and connected to your speakers. The generated <White>AudioWorklet</White> is highly
            optimized, and has the option to compiling C code (via WebAssembly).
          </p>
        </P>
        <div className="text-3xl my-4">exporting onchain</div>
        <div className="flex items-start">
          <div className="flex flex-col">
            <P>
              Since these nodes can be represented as code, you can export your work into tiny
              packages that can be run anywhere on the Web. Simply execute the code with the zen npm
              package (a small ~36KB package).
            </P>
            <P>
              A large motivation for creating the <White>zen</White> programming language, and the{" "}
              <White>zen+</White> environment, was to be able to place complex audio synthesis
              programs onto cheap Ethereum L2 networks.
            </P>
            <P>
              To achieve this, <White>zen+</White> generates a minified string representation of the
              code and provides a one-click <White>publish onchain</White> button. This deploys your
              project as a dynamic HTML NFT on{" "}
              <White>
                <a href="https://zora.co">Zora Network</a>
              </White>
              .
            </P>
            <P>
              Works published this way are deployed as a standalone <White>ERC721</White> contract--
              owned by the user-- where each minted token can be a unique variation of the project.
              The contracts themselves are custom <White>Zora Drop Contracts</White>.
            </P>
            <P>
              All <White>param</White> nodes marked with the <White>@onchain 1</White> attribute
              will be dynamically generated per token, within the defined ranges of that{" "}
              <White>param</White> node (the min/max attributes).
            </P>
          </div>
          <div className="my-auto ml-5">
            <Image
              className="border border-zinc-700 mx-auto "
              alt="Nodes Connecting"
              src="/doc-nodes-1.png"
              width={100}
              height={100}
            />
            <DoubleArrowDownIcon className="mx-auto my-5" />
            <Image
              className="border border-zinc-700 "
              alt="Nodes Connecting"
              src="/zen-code.png"
              width={350}
              height={400}
            />
            <div className="text-xs">an example snippet of (unminified) deployable zen code.</div>
          </div>
        </div>
        <div className="text-3xl my-4">visuals</div>
        <div className="flex items-start">
          <div className="mr-2">
            <P>
              <White>zen+</White> also contains a limited set of GLSL nodes for creating visuals
              (via shaders).
            </P>
            <P>
              The <White>canvas</White> node is the endpoint for a GLSL graph, displaying the shader
              program represented by the inputted nodes.
            </P>
            <P>
              <White>uniform</White> nodes let you control values inside the visual dynamically,
              with either UX controls or values coming in (from the audio graph)
            </P>
            <P>
              Since GLSL is typechecked, <White>zen+</White> will warn you if a specific node fails
              any typechecks.
            </P>
          </div>
          <Image alt="Nodes Connecting" src="/zen-gl.png" width={200} height={200} />
        </div>
        <P>
          For works published onchain, any named <White>message</White> nodes will pass its current
          value-- from the audio graph-- to any GLSL <White>uniform</White> nodes of the same name.
          This connects audio to visuals tightly, as values are emitted every 20ms.
        </P>
        <div className="text-3xl my-4">List of All Operators</div>
        <div className="text-3xl my-4">core</div>
        <p>
          <API api={core.api} />
        </p>
        <div className="text-3xl my-4">zen</div>
        <p>
          <API api={zen.api} />
        </p>
        <div className="text-3xl my-4">GLSL</div>
        <p>
          <API api={gl.api} />
        </p>
        <div className="text-3xl my-4">audio</div>
        <p>
          <API api={audio.api} />
        </p>
      </div>
    </div>
  );
};

export default Documentation;
