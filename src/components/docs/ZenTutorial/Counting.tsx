import ExamplePatch from "../ExamplePatch";
import { Card, InlineCode, P, White } from "../ui";

export const Counting = () => {
  return (
    <div>
      <P>
        In elementary school, we learned to count. We will find this concept incredibly important in{" "}
        <White link="Digital Signal Processing">DSP</White>.
      </P>
      <P>
        Lets try out a simple example. We will use the <White link="accum">accum</White> operator to
        count the number of times the <White link="phasor">phasor</White> operator crosses{" "}
        <InlineCode>0</InlineCode>.
      </P>
      <div className="h-96 flex-1">
        <ExamplePatch
          commit="patches/2c23eb74-6caa-42a3-939d-d50928d571b1"
          docId="lk6hTY3GWVuBU5OLuDQP"
        />
      </div>
      <Card className="flex gap-6 mt-6">
        <div className="flex-1">
          <P>The above patch contains several key concepts.</P>
          <P>
            The <White link="phasor">phasor</White> operator outputs a{" "}
            <White link="ramp">ramp</White> (which looks like a sawtooth waveform) at{" "}
            <InlineCode>0.3 Hz</InlineCode> and is connected to <InlineCode>out 1</InlineCode>. That
            output corresponds to the first <White link="outlet">outlet</White> of the{" "}
            <White link="subpatch">subpatch</White>.
          </P>
          <P>
            This <White link="ramp">ramp</White> is connected to a{" "}
            <White link="rampToTrig">rampToTrig</White> object which outputs a{" "}
            <InlineCode>1</InlineCode> every time the ramp, crosses <InlineCode>0</InlineCode> (i.e.
            when it resets its phase). Otherwise it outputs a <InlineCode>0</InlineCode>. We call
            this type of signal a <White link="trig">trig</White>.
          </P>
          <P>
            The <White link="trig">trig</White> is then connected to an{" "}
            <White link="accum">accum</White> operator, which adds up the{" "}
            <White link="trig">trig</White> values, to an accumulated sum.
          </P>
          <P>
            The <InlineCode>accum 0 0 4</InlineCode> tells us to start counting from{" "}
            <InlineCode>0</InlineCode>
            and to add the <White link="trig">trig</White> value to the accumulated sum,
            incrementing until it reaches <InlineCode>4</InlineCode>. When it reaches{" "}
            <InlineCode>4</InlineCode>, it resets the accumulated sum to <InlineCode>0</InlineCode>{" "}
            and starts counting again.
          </P>
        </div>
      </Card>
      <P>
        Lets try an example with some audio you can actually hear. We will use the value counted by
        the <White link="accum">accum</White> to change the pitch of a{" "}
        <White link="cycle">cycle</White> operator.
      </P>
      <div className="h-96 flex-1">
        <ExamplePatch
          commit="patches/3807d28b-e924-4511-8857-14194ff4955a"
          docId="NjHvnBtcB9MJvTQVqXiY"
        />
      </div>
      <div className="mt-6 flex gap-6">
        <Card className="w-1/2">
          <P>The above patch is very similar to previous one. </P>
          <P>
            We take the values outputted by the <White link="accum">accum</White> operator (
            <InlineCode>0,1,2,3</InlineCode>) and multiply it by <InlineCode>100</InlineCode>,
            giving us <InlineCode>0,100,200,300</InlineCode>.
          </P>
          <P>
            We add <InlineCode>100</InlineCode> to it (via a <White link="param">param</White>{" "}
            operator), to give us a nice set of frequencies.
          </P>
          <P>
            These frequency values are then fed into the <White link="cycle">cycle</White> operator.
          </P>
        </Card>
        <Card>
          <P>
            Notice that the <White link="param">param</White> is controllable via the{" "}
            <White link="attrui">attrui</White> object in the{" "}
            <White link="base patch">base patch</White>— the <White link="object">object</White>{" "}
            with the text <InlineCode>baseFrequency</InlineCode>
          </P>
          <P>
            You can control the value of that <White link="param">param</White> by clicking the{" "}
            <White link="attrui">attrui</White> object&apos;s number control, and moving up and
            down.
          </P>
          <P>
            You&apos;ll notice that the <White link="cycle">cycle</White> operator&apos;s pitch
            changes as you control this value.
          </P>
        </Card>
      </div>
    </div>
  );
};
