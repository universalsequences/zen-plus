import React, { useRef, useState, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { captureAndSendCanvas, ZenCodeSidebar } from "../ZenCodeSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useStorage } from "@/contexts/StorageContext";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { OperatorContextType } from "@/lib/nodes/context";
import { getRootPatch } from "@/lib/nodes/traverse";
import { storePatch } from "@/lib/saving/storePatch";

const SavePatch: React.FC<{ patch: Patch; hide: () => void }> = ({ hide, patch }) => {
  let [loading, setLoading] = useState(false);
  let ref = useRef<SVGSVGElement>(null);
  const { logout, user } = useAuth();
  let isSubPatch: boolean = (patch as SubPatch).parentPatch !== undefined;

  let [name, setName] = useState("");
  const save = useCallback(async () => {
    setLoading(true);

    const saves = getRootPatch(patch)
      .getAllNodes()
      .filter((x) => x.name === "onSave");

    for (const save of saves) {
      save.send(save.outlets[0], "bang");
    }

    // first save the image to ipfs
    if (name && user && user.email) {
      let canvases = document.getElementsByClassName("rendered-canvas");
      let canvas = canvases[0];
      console.log("canvas = ", canvas);
      if (canvas) {
        captureAndSendCanvas(canvas as HTMLCanvasElement, true).then((screenshot: any) => {
          if (name) {
            console.log("storing patch with screenshot=", screenshot);
            storePatch(name, patch, isSubPatch, user.email, screenshot).then(() => {
              setLoading(false);
              hide();
            });
          }
        });
      } else {
        if (ref.current) {
          const svgData = ref.current.outerHTML;
          const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
          const formData = new FormData();
          formData.append("file", blob, "screenshot.svg");

          // Send the image to the server
          fetch("/api/uploadImageToGoogle", {
            method: "POST",
            body: formData,
          })
            .then((response) => response.json())
            .then((data) => {
              let screenshot = data.url;
              storePatch(name, patch, isSubPatch, user.email, screenshot).then(() => {
                setLoading(false);
                hide();
              });
            })
            .catch((error) => {
              console.error("Error uploading image:", error);
              setLoading(false);
              hide();
            });
        } else {
          storePatch(name, patch, isSubPatch, user.email).then(() => {
            setLoading(false);
            hide();
          });
        }
      }
    }
  }, [patch, name, isSubPatch, setLoading]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "enter") {
        save();
      }
    },
    [save],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  let maxX = Math.max(...patch.objectNodes.map((x) => x.position.x)) + 200;
  let maxY = Math.max(...patch.objectNodes.map((x) => x.position.y)) + 200;

  return (
    <>
      <fieldset className="Fieldset">
        <label className="Label mr-4" htmlFor="name">
          Name
        </label>
        <input
          style={{ borderBottom: "1px solid #4f4f4f" }}
          className="Input px-2 bg-black-clear text-white outline-none"
          placeholder="Enter name to save"
          value={name}
          onChange={(e: any) => setName(e.target.value)}
          defaultValue=""
        />
      </fieldset>
      {loading && <div className="mx-auto my-10 spinner" />}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 126 96"
        ref={ref}
        width={126}
        height={96}
        className="bg-zinc-900 rounded-lg mx-auto my-10"
      >
        {patch.objectNodes.map((x, i) => (
          <rect
            key={i}
            x={(126 * x.position.x) / maxX}
            y={(96 * x.position.y) / maxY}
            fill={
              x.operatorContextType === OperatorContextType.CORE
                ? "blue"
                : x.operatorContextType === OperatorContextType.AUDIO
                  ? "yellow"
                  : x.operatorContextType === OperatorContextType.GL
                    ? "violet"
                    : "gray"
            }
            width={6}
            height={2}
          />
        ))}
      </svg>
      <div
        className="save-connect"
        style={{ display: "flex", marginTop: 25, justifyContent: "flex-end" }}
      >
        <Dialog.Close asChild>
          <button
            onClick={save}
            className={
              (loading ? "opacity-20 pointer-events-none " : "") +
              "bg-black px-2 py-1 text-white rounded-full"
            }
          >
            Save changes
          </button>
        </Dialog.Close>
      </div>
    </>
  );
};

export default SavePatch;

function blobToBase64(blob: any): Promise<any> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result attribute contains the data as a base64-encoded string
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}
