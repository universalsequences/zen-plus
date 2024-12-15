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
        <h3 className="text-lg font-bold">Shaping Amplitude</h3>
      </P>
      <P>
        The <White link="amplitude">amplitude</White> of a signal can be thought of as it&apos;s
        volume.
      </P>
      <P>
        Shaping the amplitude of a signal can be used to carve out individual notes in a
        synthesizer.
      </P>

      <div className="flex gap-6 ">
        <P className="w-96">
          The patch below shows one way to shape amplitude, starting with a{" "}
          <White link="phasor">phasor</White> acting as clock source. We then use the{" "}
          <InlineCode>
            <White link="<">{"<"}</White>
          </InlineCode>{" "}
          operator to generate a <White link="pulse">pulse</White> from the{" "}
          <White link="ramp">ramp</White>, with a <InlineCode>width</InlineCode>{" "}
          <White link="param">param</White>.
        </P>
        <P className="w-96">
          The magic happens with the <White link="vactrol">vactrol</White> operator, which takes the{" "}
          <White link="pulse">pulse</White> and smooths it out. This smoothing takes{" "}
          <InlineCode>attack</InlineCode> and <InlineCode>release</InlineCode>{" "}
          <White link="param">params</White>. Try changing the <InlineCode>attack</InlineCode>,{" "}
          <InlineCode>release</InlineCode>, and <InlineCode>width</InlineCode> values to see how it
          changes the output.
        </P>
      </div>

      <div className="h-[520px] mt-6">
        <ExamplePatch
          commit="patches/6f1e8912-ae15-44d7-a099-a0bf265f8c05"
          docId="2RrXroTxBxDWc6B1adN1"
        />
      </div>
      <P>
        The shape of the amplitude envelope is then multiplied by the signal coming from the fm
        oscillator. We&apos;ll learn more about fm synthesis in later sections.
      </P>
    </div>
  );
};
