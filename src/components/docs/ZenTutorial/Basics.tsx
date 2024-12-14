import ExamplePatch from "../ExamplePatch";
import { GlossaryDefinition } from "../GlossaryDefinition";
import { Card, InlineCode, P, White } from "../ui";

export const Basics = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold">Digital Audio</h2>
      <P>
        Digital audio is just numbers that changes over time - that&apos;s all an audio signal is!
      </P>
      <P>
        The <White link="zen">zen</White> operators allow you to generate and shape audio in a
        number of ways, in a process known as{" "}
        <White link="Digital Signal Processing">Digital Signal Processing</White> (or DSP).
      </P>
      <GlossaryDefinition name="Digital Signal Processing" />
      <P>
        These numbers are generated in real-time by an{" "}
        <White link="AudioWorklet">AudioWorklet</White> (which is compiled everytime you edit the
        zen subpatch) and sent out through the outlets of the <White link="zen">zen</White> object.
        The object can then be connected to a <White link="speakers~">speakers~</White> to be heard.
      </P>
      <P>
        Numbers between <InlineCode>[-1,1]</InlineCode> are your safe zone for audio - going beyond
        will cause clipping.
      </P>
      <h2 className="text-2xl font-bold">Audio Math</h2>
      <P>
        <White link="Digital Signal Processing">DSP</White> is a fancy way of saying{" "}
        <InlineCode>audio math</InlineCode>.
      </P>
      <P>You can do so much with just basic arithmetic.</P>
      <div className="flex  gap-4 w-full">
        <div className="w-1/3">
          <P>
            Controlling the amplitude (or volume) of an audio signal is as simple as multiplying,
            with a <White link="*">*</White> operator.
          </P>
          <P>
            Mixing two audio signals together is as simple as adding them together, with a{" "}
            <White link="+">+</White> operator.
          </P>
          <Card>
            <P>
              The example to the right adds two sine waves together (at <InlineCode>120</InlineCode>{" "}
              and <InlineCode>300</InlineCode> Hz) and then scales the amplitude by{" "}
              <InlineCode>0.2</InlineCode>.
            </P>
            <P>
              The <White link="cycle">cycle</White> operators are used to generate a sine waves.
            </P>
          </Card>
        </div>
        <div className="h-96 flex-1">
          <ExamplePatch
            commit="patches/9925334e-0091-42a7-a791-496705c5c8fd"
            docId="H8a9Lb4zy5VYprfeD0Mi"
          />
        </div>
      </div>
      <P>
        Try editing the <White link="subpatch">subpatch</White> above to make the sound louder, by
        changing <InlineCode>0.2</InlineCode> to <InlineCode>0.5</InlineCode>.
      </P>
      <P>
        The <White link="cycle">cycle</White> operator outputs a sine wave from{" "}
        <InlineCode>[-1, 1]</InlineCode> so it&apos;s important to keep the sum from going past{" "}
        <InlineCode>[-1, 1]</InlineCode>. The <White link="*">*</White> operator is used to scale
        this sum to a safe range.
      </P>
      <h2 className="text-2xl font-bold">Mixing Signals</h2>
      <P>
        To interpolate between 2 signals, you can use the <White link="mix">mix</White> operator.
      </P>
      <P>
        The first two <White link="inlet">inlets</White> are the two signals you want to interpolate
        between, and the third <White link="inlet">inlet</White> is the amount of interpolation
        between the two signals.
      </P>
      <P>
        When the interpolation amount is <InlineCode>0</InlineCode>, the first signal is output, and
        when the interpolation amount is <InlineCode>1</InlineCode>, the second signal is output.
        When the interpolation amount is between <InlineCode>0</InlineCode> and{" "}
        <InlineCode>1</InlineCode>, the signal is a mix between the two signals.
      </P>
      <div className="flex gap-4 w-full my-6">
        <Card className="w-1/2">
          <P>
            In the example below, we mix the same two sine waves together, but with a varying
            interpolation signal (via a much slower <White link="cycle">cycle</White> operator).
          </P>
          <P>
            This slower modulation signal is sometimes called an LFO (Low Frequency Oscillator).
          </P>
        </Card>
        <Card>
          <P>
            The <White link="scale">scale</White> operator is used to scale the output of the slower{" "}
            <White link="cycle">cycle</White> operator (controlling the interpolation factor) to a
            range between <InlineCode>0</InlineCode> and <InlineCode>1</InlineCode>, which is the
            range accepted by the <White link="mix">mix</White> operator.
          </P>
          <P>
            The first two values in the <InlineCode>scale -1 1 0 1</InlineCode> operator are the
            input range, and the last two values are the output range.
          </P>
          <P>
            We are essentially mapping the output of the slower <White link="cycle">cycle</White>{" "}
            operator (which outputs <InlineCode>[-1, 1]</InlineCode>) to a range between{" "}
            <InlineCode>0</InlineCode> and <InlineCode>1</InlineCode>.
          </P>
        </Card>
      </div>
      <div className="h-96">
        <ExamplePatch
          commit="patches/c548e6d0-39da-4d7c-802a-de2464e074c0"
          docId="KBkkEpkk79rzwayroubt"
        />
      </div>
      <div className="my-6">
        Try editing the <White link="subpatch">subpatch</White> above to make the modulation sound
        "faster", by editing the frequency of the slower <White link="cycle">cycle</White> operator.
      </div>
      <div className="my-6">What happens when the modulation signal is too fast?</div>
    </div>
  );
};
