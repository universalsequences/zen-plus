import { White, Core, AudioNode, P } from "./ui";
import ExamplePatch from "./ExamplePatch";

export const Intro = () => {
  return (
    <>
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
      <div className="flex gap-2 items-start w-full">
        <div className="border rounded-lg border-zinc-700 p-6 bg-zinc-900 shadow-sm w-2/3">
          <h3 className="text-lg font-semibold mb-4">Creating an Object Node</h3>
          <p className="mb-2">
            To create an empty <White>object node</White>, double click the patch editor.
            You&apos;ll see a list of available <White>operators</White>, grouped by{" "}
            <White>operator type</White>.
          </p>
        </div>

        <div className="w-full h-72 ">
          <ExamplePatch />
        </div>
      </div>
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
            <div className="italic">
              creating optimized audio nodes (can only be used inside zen subpatches)
            </div>
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
      </div>
      <div className="flex mt-6 gap-2">
        <div className="w-2/3">
          <p className="">
            Switch between modes using <White>⌘-E </White>to lock/unlock the patch editor. You can
            also click the lock icon at the right of the bottom toolbar.
          </p>
          <p className="mt-4">
            This clear distinction between building (Edit Mode) and using (Performance Mode) helps
            prevent accidental modifications while performing or testing your patches.
          </p>
          <P>
            The patch, to the right, demonstrates these two modes. Click the lock icon to switch
            between them. While in <White>Performance Mode</White>, you can click the{" "}
            <White>toggle</White> object (the node with the x) to turn on the <White>metro</White>{" "}
            object.
          </P>
        </div>
        <div className="w-full h-96">
          <ExamplePatch
            commit="patches/4ca73a2b-d8d6-4259-a759-5d9606006ca7"
            docId="aN7tLdgtRy8JvhMEts37"
          />
        </div>
      </div>
      <P>
        <h2 className="text-xl font-semibold mb-4">Cables</h2>
        <P>Cables are used to connect nodes together.</P>
        <div className="flex gap-4">
          <div className="w-72">
            An <White>object node</White> can be thought as a function, representing an operation to
            data coming in through its <White>inlets</White>, outputting its results through its{" "}
            <White>outlets</White>.
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
            When an <White>object node</White> receives messages from all its <White>inlets</White>,
            it outputs its result to its <White>outlets</White>.
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
    </>
  );
};
