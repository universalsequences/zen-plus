import ExamplePatch from "../ExamplePatch";
import { GlossaryDefinition } from "../GlossaryDefinition";
import { Card, InlineCode, P, White } from "../ui";

export const Shaping = () => {
  return (
    <div>
      <GlossaryDefinition name="unit shaping" />
      <P>
        When normalized signals are repeated at a high enough frequency, they can be used to create
        oscillators. Oscillators are the bread and butter of synthesizers.
      </P>
      <P>
        Slower signals can be used as modulator sources. These are often called{" "}
        <White link="low frequency oscillators">LFOs</White>.
      </P>
      <div className="flex gap-6 mt-6">
        <div className="w-96">
          <P>
            <h3 className="text-lg font-bold">Ramps</h3>
          </P>
          <P>
            One of the most useful <White link="normalized signal">normalized signals</White> is the{" "}
            <White link="ramp">ramp</White> signal, produced by the{" "}
            <White link="phasor">phasor.</White>{" "}
          </P>
          <P>
            The fact that it linearly ramps from <InlineCode>0</InlineCode> to{" "}
            <InlineCode>1</InlineCode> makes it a very useful signal for many purposes.
          </P>
        </div>
        <div className="flex justify-center">
          <img src="/ramp.svg" className="w-80 rounded-lg" alt="ramp" />
        </div>
      </div>
      <div className="flex gap-6 mt-6">
        <div className="w-96">
          <P>
            <h3 className="text-lg font-bold">Triangle</h3>
          </P>
          <P>
            Applying <InlineCode>triangle</InlineCode> on a <White link="ramp">ramp</White> produces
            a <White link="triangle">triangle</White> signal.
          </P>
        </div>
        <div className="flex justify-center">
          <img src="/triangle.svg" className="w-80 rounded-lg" alt="triangle" />
        </div>
      </div>

      <P>
        The example below shows 3 waveforms, all created from the same{" "}
        <White link="ramp">ramp</White> signal.
      </P>
      <P>
        Try increasing the <White>frequency</White> parameter via the{" "}
        <White link="attrui">attrui</White>, and notice how it begins to produce an audible tone.
      </P>
      <div className="h-96 mt-6">
        <ExamplePatch
          commit="patches/5de7ce63-6ebd-46b6-9b23-227467f7dafb"
          docId="1p3HRxUx18teXIGLMSlh"
        />
      </div>

      <div className="flex gap-6 mt-6">
        <div className="w-96">
          <P>
            <h3 className="text-lg font-bold">Square/Pulse</h3>
          </P>
          <P>
            With a little bit of arithmetic, we can transform the <White link="ramp">ramp</White>{" "}
            signal into variety of useful signals.
          </P>
          <P>
            Applying <InlineCode>{"<"} 0.5</InlineCode> on a <White link="ramp">ramp</White>{" "}
            produces a <White link="square">square</White> signal.
          </P>
          <P>
            Replacing <InlineCode>0.5</InlineCode> with different values produces pulses with
            different pulse widths or duty cycles.
          </P>
          <P>The patch above shows this waveform, along with a few other common ones.</P>
        </div>
        <div className="flex justify-center">
          <img src="/square2.svg" className="w-80 rounded-lg" alt="square" />
        </div>
      </div>
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
    </div>
  );
};
