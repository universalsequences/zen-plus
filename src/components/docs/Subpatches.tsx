import { CubeIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import ExamplePatch from "./ExamplePatch";
import { AudioNode, Card, Core, GL, Zen, P, White } from "./ui";
import { useState } from "react";

export const Subpatches = () => {
  const [selectedType, setSelectedType] = useState<"zen" | "core" | "gl" | "audio">("zen");

  return (
    <div>
      <P>
        Patches can be organized into distinct units of logic, via{" "}
        <White link="subpatch">subpatches</White>.
      </P>
      <P>
        To create a <White link="subpatch">subpatch</White>, create a new{" "}
        <White link="object">object</White> and type <White>p</White> (the subpatch operator) and
        press enter.
      </P>
      <P>Subpatches can contain any number of nodes, including other subpatches.</P>
      <P>
        The root patch that contains all the subpatches is called the{" "}
        <White link="base patch">base patch</White>.
      </P>
      <div className="flex gap-4">
        <Card className="w-1/3">
          <h2 className="text-xl font-semibold mb-4">Types</h2>
          <P>
            Each subpatch has a distinct <White link="patch type">type</White>, that matches the
            types of operators.
          </P>
          <P>
            Some subpatches behave differently, depending on their{" "}
            <White link="patch type">type</White>.
          </P>
          <div className="flex gap-2 mt-2">
            <div
              onClick={() => setSelectedType("zen")}
              className={`cursor-pointer ${selectedType !== "zen" ? "opacity-50" : ""}`}
            >
              <Zen />
            </div>
            <div
              onClick={() => setSelectedType("core")}
              className={`cursor-pointer ${selectedType !== "core" ? "opacity-50" : ""}`}
            >
              <Core />
            </div>
            <div
              onClick={() => setSelectedType("gl")}
              className={`cursor-pointer ${selectedType !== "gl" ? "opacity-50" : ""}`}
            >
              <GL />
            </div>
            <div
              onClick={() => setSelectedType("audio")}
              className={`cursor-pointer ${selectedType !== "audio" ? "opacity-50" : ""}`}
            >
              <AudioNode />
            </div>
          </div>
        </Card>
        <Card className="w-2/3">
          {selectedType === "zen" && (
            <>
              <P>
                The <White link="zen">zen</White> type is particularly special, as subpatches of
                type <White link="zen">zen</White> compile the entire subpatch into a single audio
                node.
              </P>
              <P>
                The resulting <White>zen</White> object can be connected to other audio nodes (such
                as the <White>speakers~</White>~ node) or even other zen nodes!
              </P>
              <P>
                They are inspired by Max MSPs gen~ object, and allow you to create custom DSP nodes,
                from a wide range of built-in operators.
              </P>
            </>
          )}
          {selectedType === "core" && (
            <P>
              <White>core</White> subpatches are used for processing messages and control flow. They
              contain basic operators for math, logic, timing, and data manipulation.
            </P>
          )}
          {selectedType === "gl" && (
            <P>
              <White>gl</White> subpatches are specialized for graphics processing. They allow you
              to create custom shaders and visual effects using WebGL.
            </P>
          )}
          {selectedType === "audio" && (
            <P>
              <White>audio</White> subpatches are designed for audio processing. They contain
              operators for synthesis, analysis, and audio signal manipulation.
            </P>
          )}
        </Card>
      </div>
      <P>
        Try it out by double clicking the patch and typing <White>p</White> and pressing enter
      </P>
      <div className="h-96">
        <ExamplePatch />
      </div>
      <div className="flex gap-4 mt-6">
        <div className="w-96">
          <P>
            Once created, you can double click the <White>p</White>{" "}
            <White link="object">object</White> you created to expand it.
          </P>
          <P>
            Alternatively, you can right-click the <White>p</White>{" "}
            <White link="object">object</White> and select <White>Expand</White>
          </P>
        </div>
        <div className="w-96">
          <P>
            Inside the new subpatch window, try creating some new{" "}
            <White link="object">objects</White>.
          </P>
        </div>
      </div>
      <P>You can rename and close the subpatch in the bottom bar of the subpatch window.</P>
      <Card className="w-full">
        <h2 className="text-xl font-semibold mb-4">Attributes</h2>
        <P>
          Each <White link="node">node</White> has <White link="attributes">attributes</White> that
          can be used to configure them.
        </P>
        <P>
          When a <White link="node">node</White> is selected, you can click on the sidebar button w/
          the cube icon (shown below) to open the <White link="inspector">inspector</White>.
          <CubeIcon className="mt-4" />
        </P>
        <P>
          You can also press the <White>tab</White> key to open the{" "}
          <White link="inspector">inspector</White> for the selected node.
        </P>
        <P>
          The <White link="p">p</White> <White link="object">object</White> has a{" "}
          <White link="type">type</White> attribute, which can be used to select the type of the
          subpatch.
        </P>
      </Card>
      <h2 className="text-xl font-semibold my-4">Encapsulating Nodes</h2>
      <P>
        You can quickly create a subpatch out of a selection of nodes by first selecting multiple
        nodes-- by dragging your mouse to select them-- and then right clicking and choosing
        <White>encapsulate nodes</White>
      </P>
    </div>
  );
};
