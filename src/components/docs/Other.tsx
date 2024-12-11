import Image from "next/image";
import { DoubleArrowDownIcon } from "@radix-ui/react-icons";
import { P, White } from "./ui";

export const Other = () => {
  return (
    <div>
      <div className="text-3xl my-4">exporting onchain</div>
      <div className="flex items-start">
        <div className="flex flex-col">
          <P>
            Since these nodes can be represented as code, you can export your work into tiny
            packages that can be run anywhere on the Web. Simply execute the code with the zen npm
            package (a small ~36KB package).
          </P>
          <P>
            A large motivation for creating the <White>zen</White> programming language, and the{" "}
            <White>zen+</White> environment, was to be able to place complex audio synthesis
            programs onto cheap Ethereum L2 networks.
          </P>
          <P>
            To achieve this, <White>zen+</White> generates a minified string representation of the
            code and provides a one-click <White>publish onchain</White> button. This deploys your
            project as a dynamic HTML NFT on{" "}
            <White>
              <a href="https://zora.co">Zora Network</a>
            </White>
            .
          </P>
          <P>
            Works published this way are deployed as a standalone <White>ERC721</White> contract--
            owned by the user-- where each minted token can be a unique variation of the project.
            The contracts themselves are custom <White>Zora Drop Contracts</White>.
          </P>
          <P>
            All <White>param</White> nodes marked with the <White>@onchain 1</White> attribute will
            be dynamically generated per token, within the defined ranges of that{" "}
            <White>param</White> node (the min/max attributes).
          </P>
        </div>
        <div className="my-auto ml-5">
          <Image
            className="border border-zinc-700 mx-auto "
            alt="Nodes Connecting"
            src="/doc-nodes-1.png"
            width={100}
            height={100}
          />
          <DoubleArrowDownIcon className="mx-auto my-5" />
          <Image
            className="border border-zinc-700 "
            alt="Nodes Connecting"
            src="/zen-code.png"
            width={350}
            height={400}
          />
          <div className="text-xs">an example snippet of (unminified) deployable zen code.</div>
        </div>
      </div>
      <div className="text-3xl my-4">visuals</div>
      <div className="flex items-start">
        <div className="mr-2">
          <P>
            <White>zen+</White> also contains a limited set of GLSL nodes for creating visuals (via
            shaders).
          </P>
          <P>
            The <White>canvas</White> node is the endpoint for a GLSL graph, displaying the shader
            program represented by the inputted nodes.
          </P>
          <P>
            <White>uniform</White> nodes let you control values inside the visual dynamically, with
            either UX controls or values coming in (from the audio graph)
          </P>
          <P>
            Since GLSL is typechecked, <White>zen+</White> will warn you if a specific node fails
            any typechecks.
          </P>
        </div>
        <Image alt="Nodes Connecting" src="/zen-gl.png" width={200} height={200} />
      </div>
      <P>
        For works published onchain, any named <White>message</White> nodes will pass its current
        value-- from the audio graph-- to any GLSL <White>uniform</White> nodes of the same name.
        This connects audio to visuals tightly, as values are emitted every 20ms.
      </P>
    </div>
  );
};
