import Image from "next/image";
import { P, White } from "./ui";
import ExamplePatch from "./ExamplePatch";
import { Card } from "./ui";

export const Zen = () => {
  return (
    <div>
      <P>
        Subpatches of type <White>zen</White> allow you to build up custom DSP nodes.
      </P>
      <P>
        Under the hood, these subpatches are compiled into an <White>AudioWorklet</White> that can
        be connected to other audio objects or even other zen objects.
      </P>
      <P>
        Below is an example of a <White>zen subpatch</White>. It is a fm synthesizer. To hear it,
        press the play button (which is actually a <White>toggle</White> object!)
      </P>
      <div className="h-96">
        <ExamplePatch
          docId="patches/8305e168-9217-40f3-a310-3762c8cfcdbd"
          commit="patches/8305e168-9217-40f3-a310-3762c8cfcdbd"
        />
      </div>
      <div className="flex gap-6 mt-6">
        <Card className="w-full">
          <P>
            Note that the <White>zen</White> object (whose expanded patch is shown above to the
            right) outputs audio. Because of this, it can be connected to other audio nodes.
          </P>
          <P>
            In this example, the <White>zen</White> object is connected to a{" "}
            <White>live.meter~</White> object (which controls volume), which is then connected to a{" "}
            <White>speakers~</White> object and a <White>scope~</White> object.
          </P>
        </Card>
      </div>
      <div className="flex mt-5">
        <P className="w-96">
          <P>
            Each <White>inlet</White> can receive inputs from one node, providing inputs to the
            desired operation. Nodes just containing numbers simply output that number to other
            nodes.
          </P>
          <P className="mt-10 text-xs">
            For example, this one represents a phasor (sawtooth) and cycle (sine wave) mixed evenly
            50% (noted by the 0.5) at the same rate.
          </P>
        </P>
        <Image alt="Nodes Connecting" src="/doc-nodes-2.png" width={250} height={100} />
      </div>
      <P>
        zen+ is heavily inspired by Max-MSP, and its audio processing operators are very similar to
        the gen~ operators in Max.
      </P>
      <div className="text-3xl my-4">the compiler</div>
      <P>
        Its important to note that <White>Nodes</White> <span className="italic">do not</span>{" "}
        process literal audio signal. Instead, they form mathematical expressions that compile into
        efficient audio graphs. Looked at another way, a <White>zen subpatch</White> is simply code
        represented visually. More on this later.
      </P>
      <P className="mr-2">
        <P>
          Compilation is kicked off once a graph is connected to a{" "}
          <span className="font-bold">out 1</span> node and/or any part of the patch is edited.
        </P>
        <P className="mt-5">
          When this happens, a new <White>AudioWorklet</White> is generated (within milliseconds)
          and connected to your speakers. The generated <White>AudioWorklet</White> is highly
          optimized, and has the option to compiling C code (via WebAssembly).
        </P>
      </P>
    </div>
  );
};
