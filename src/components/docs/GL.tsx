import ExamplePatch from "./ExamplePatch";
import { Card, P, White } from "./ui";

export const GL = () => {
  return (
    <>
      <P>
        Zen+ can be used to create visuals, via WebGL shaders. The <White link="gl">gl</White>{" "}
        <White link="operator">operators</White> available in Zen+ are used to create shaders.
      </P>
      <P>
        The final destination a set of <White link="gl">gl</White>{" "}
        <White link="object">objects</White> is the <White link="canvas">canvas</White> object.
      </P>
      <div className="w-full flex gap-6">
        <div className="w-1/2">
          <P>
            Whenever an object of <White link="operator type">type</White>{" "}
            <White link="gl">gl</White> is connected to a <White link="canvas">canvas</White>{" "}
            object, the shader is recompiled and the canvas is redrawn.
          </P>
          <P>
            Each <White link="gl">gl</White> object takes the incoming{" "}
            <White link="AST">ASTs</White> from their <White link="inlet">inlet</White> and outputs
            the next step of the <White link="AST">AST</White>.
          </P>
          <P>
            You can think of these mini <White link="AST">ASTs</White> as snippets of the final{" "}
            <White link="shader">shader</White> that will be generated and displayed by the{" "}
            <White link="canvas">canvas</White> object.
          </P>
          <P>A very simple shader is shown to the right.</P>
        </div>
        <div className="h-96 w-full">
          <ExamplePatch
            commit="patches/1e32aef5-6300-4d7c-9bb1-e93f081e2fe9"
            docId="IKK9XkW7rR8iu2Da1hnH"
          />
        </div>
      </div>
      <Card info={true}>
        <P>
          Fragment shaders are a type of <White link="shader">shader</White> that is used to render
          2D/3D graphics. They basically specify how each pixel should colored, based on the current
          coordinate. You can think of your patch as a function that is triggered for every single
          pixel in the canvas.
        </P>
        <P>
          In the example above, the <White>uv</White> <White link="object">object</White> represents
          the current {"pixel's"} coordinate as a 2-dimensional vector with a range of [-1,1]
        </P>
        <P>
          The mix operator, used above, cooresponds precisely with the mix operator in glsl. Many of
          the common glsl operators work this exact way.
        </P>
      </Card>
      <h2 className="text-xl font-bold mt-6">Types</h2>
      <P>
        GLSL is a staticly typed language, which means there are some restrictions on what{" "}
        <White link="gl">gl</White> operators can be connected.
      </P>
      <P>
        When the patch notices you&apos;ve connected two operators that don&apos;t match, it will
        color the mismatched <White link="object">object</White> orange, to mark them as "errored".
      </P>
      <P>
        You can also see the type of an <White link="inlet">inlet</White> and{" "}
        <White link="outlet">outlet</White> by hovering over it.
      </P>
    </>
  );
};
