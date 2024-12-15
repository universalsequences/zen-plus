import ExamplePatch from "../ExamplePatch";
import { Card, White } from "../ui";

import { InlineCode, P } from "../ui";

export const ShapingII = () => {
  return (
    <div>
      <P>
        <h3 className="text-lg font-bold">More Advanced Shaping</h3>
      </P>
      <P>
        Zen+ contains several community subpatches for more advanced unit shaping, interpretted from
        the{" "}
        <a
          className="underline text-blue-400"
          href="https://www.amazon.com/Generating-Sound-Organizing-Time-Thinking/dp/1732590311"
        >
          Generating Sound and Organizing Time
        </a>{" "}
        book by Graham Wakefield and Gregory Taylor (highly recommended read).
      </P>
      <P>
        These subpatches are prefixed with <InlineCode>go.unit</InlineCode>. To access them, create
        a new <White link="object">object</White> and type <InlineCode>go.unit</InlineCode> and
        select one.
      </P>
      <P>
        The example below expands on the <InlineCode>go.unit.pow</InlineCode> subpatch, showing how
        a bit more arithmetic and some simple modulation can create alien-like oscillators.
      </P>
      <div className="h-96 mt-6">
        <ExamplePatch
          commit="patches/b79b3d95-c2d2-4a96-8ad8-25181efd0399"
          docId="kDS86ofEaHkfL2WxmwPH"
        />
      </div>
      <P>
        Try changing the <White>frequency</White> parameter to a lower value, like{" "}
        <InlineCode>2</InlineCode>, and notice how the waveform becomes much more apparent.
      </P>
      <P>This patch contains several concepts we haven&apos;t covered yet.</P>
      <div className="flex gap-6 mt-6">
        <Card>
          <P>
            <h3 className="text-lg font-bold">
              <White link="latch">latch</White>
            </h3>
            <P>
              Sometimes you want to <InlineCode>sample</InlineCode> a signal, and{" "}
              <InlineCode>hold</InlineCode> it based on some condition.
            </P>
            <P>
              The <White link="latch">latch</White> operator does this kind of{" "}
              <White>sample and hold</White>. Whenever the right inlet receives a non-zero value, it
              samples the input in the left inlet, and holds the value.
            </P>
          </P>
        </Card>
        <Card>
          <P>
            In the patch above, the <White link="latch">latch</White> is used to sample modulation
            changes to the shape, each time the <White link="ramp">ramp</White> produces a{" "}
            <White link="trig">trig</White> signal.
          </P>
          <P>
            The value it samples is held for the remainder of the <White link="ramp">ramp</White>{" "}
            cycle. Because of this, the shape parameter only changes once per cycle, which prevents
            clicks.
          </P>
        </Card>
      </div>
      <P>
        The following, much simpler patch, shows the <White link="latch">latch</White> operator in
        action.
      </P>
      <P>
        In the patch, we generate random values, using the <White link="noise">noise</White>{" "}
        operator, and sample and hold one of these random numbers every time the{" "}
        <White link="ramp">phasor</White> produces a <White link="trig">trig</White>.
      </P>
      <P>
        In other words, we ignore all the random numbers being generated between the{" "}
        <White link="trig">trigs</White>, and care to use a new random number whenever a{" "}
        <White link="trig">trig</White> is received.
      </P>
      <div className="h-96 mt-6">
        <ExamplePatch
          commit="patches/21fcbdb8-7d58-407e-8c4c-5b9c3025fcd6"
          docId="G1XCd9QcSKUIn4afXdM1"
        />
      </div>
      <P>
        <h3 className="text-lg font-bold">Sigmoids</h3>
      </P>
      <P>
        Sigmoids are a family of functions that are used to shape unruly input signals that exceed
        the audio bounds of <InlineCode>[-1,1]</InlineCode>.
      </P>
      <P>
        These functions keep the signal within the bounds of <InlineCode>[-1,1]</InlineCode>, and
        produce a smooth curve (unlike hard clipping which just clips the signal to the bounds, very
        harshly). This often sounds like distortion/saturation.
      </P>
      <P>
        The example below demonstrates the simplest sigmoid function,{" "}
        <White link="tanh">tanh</White>.
      </P>
      <div className="h-[450px] mt-6">
        <ExamplePatch
          commit="patches/6aa3954f-aa77-4aca-a01b-f8559d2400e2"
          docId="4fdDpIt4Wi8nR5mu1yAW"
        />
      </div>
    </div>
  );
};
