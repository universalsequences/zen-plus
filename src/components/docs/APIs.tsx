import API from "./API";
import * as zen from "@/lib/nodes/definitions/zen/doc";
import * as gl from "@/lib/nodes/definitions/gl/doc";
import * as audio from "@/lib/nodes/definitions/audio/doc";
import * as core from "@/lib/nodes/definitions/core/doc";
import { P } from "./ui";
export const APIs = () => {
  return (
    <>
      <div className="text-3xl my-4">List of All Operators</div>
      <div className="text-3xl my-4">core</div>
      <P>
        <API api={core.api} />
      </P>
      <div className="text-3xl my-4">zen</div>
      <P>
        <API api={zen.api} />
      </P>
      <div className="text-3xl my-4">GLSL</div>
      <P>
        <API api={gl.api} />
      </P>
      <div className="text-3xl my-4">audio</div>
      <P>
        <API api={audio.api} />
      </P>
    </>
  );
};
