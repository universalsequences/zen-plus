import ExamplePatch from "../ExamplePatch";
import { GlossaryDefinition } from "../GlossaryDefinition";
import { InlineCode, P, White } from "../ui";

export const Feedback = () => {
  return (
    <div>
      <GlossaryDefinition name="feedback" />
      <P>
        One of the strengths of working sample-by-sample is that we can easily create feedback-based
        effects, using the <White link="history">history</White> operator.
      </P>
      <GlossaryDefinition name="history" />
      <div className="flex gap-6 mt-6">
        <div className="w-64">
          <P>
            The following patch shows how we can create our own <White link="accum">accum</White>{" "}
            operator, from scratch using <White link="history">history</White>.
          </P>
          <P>
            Every time we receive a new <White link="trig">trig</White> from{" "}
            <White link="rampToTrig">rampToTrig</White>, we add the <White link="trig">trig</White>{" "}
            (which is 1 or 0) to the value stored in the <White link="history">history</White>.
          </P>
          <P>
            We then write this sum back into the <White link="history">history</White>, so that it
            can be used again in the next sample.
          </P>
          <P>
            You can think of this patch as a function that is executed every sample, and the{" "}
            <White link="history">history</White> containing the previous value of whatever was last
            written to it.
          </P>
        </div>
        <div className="h-96 mt-6 flex-1">
          <ExamplePatch
            commit="patches/7b8b34f6-26e8-4820-9831-7a640f6f9952"
            docId="lZzMfsvey8Po7nPBZ4wZ"
          />
        </div>
      </div>
      <P>
        <h3 className="text-lg font-bold">Onepole Filters</h3>
        <P>
          The previous patch only really does anything everytime theres a{" "}
          <White link="trig">trig</White>, but things get really interesting when we constantly
          write new values to the <White link="history">history</White>.
        </P>
        <P>
          What would happen if we tried to average out the previous value with the input? Would this
          smooth out the sound as it computes a moving average?{" "}
        </P>
      </P>
      <div className="flex gap-6 mt-6">
        <div className="w-64 mt-6">
          <P>
            The patch to the right shows how such an average can smooth out changing values, like
            the frequency to create a portamento / glide effect in an oscillator.
          </P>
          <P>
            Look closely at the <White link="mix">mix</White> and{" "}
            <White link="history">history</White> operators. We are interpolating between the
            previous value of the mix (stored in the <White link="history">history</White>) and the
            original input.
          </P>
          <P>
            The value <InlineCode>0.9995</InlineCode> controls the amount of interpolation. In this
            case we are heavily biasing towards the averaged value (at{" "}
            <InlineCode>99.95%</InlineCode>), which is why the frequencies end up gliding audibly.
          </P>
        </div>
        <div className="h-96 mt-6 flex-1">
          <ExamplePatch
            commit="patches/052fe8c3-f2d4-44f3-8795-9f038e7df16a"
            docId="patches/aab61422-b497-4e21-a9ae-351c8d9c7aac"
          />
        </div>
      </div>
      <P>
        This type of averaging is called a <White link="onepole">onepole filter</White>. Zen+ has a
        dedicated <White link="onepole">onepole</White> operator that does this for you.
      </P>
    </div>
  );
};
