import React, { useEffect, useCallback, useState } from "react";
import { useNetwork } from "wagmi";
import { parseEther } from "viem";
import { minify } from "@/lib/nodes/compilation/minify";
import { db } from "@/lib/db/firebase";
import {
  documentId,
  addDoc,
  doc,
  getDoc,
  getFirestore,
  updateDoc,
  collection,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";
import { zoraSepolia, goerli, zora } from "wagmi/chains";
import { useAuth } from "@/contexts/AuthContext";
import MintSound from "./MintSound";
import { usePatches } from "@/contexts/PatchesContext";
import Attributes from "./Attributes";
import type { SubPatch, Patch, ObjectNode } from "@/lib/nodes/types";
import { useSwitchNetwork } from "wagmi";
import { CameraIcon, Cross2Icon, Share1Icon } from "@radix-ui/react-icons";
import { useSelection } from "@/contexts/SelectionContext";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

interface Parameters {
  parameterNames: string[];
  maxValues: number[];
  minValues: number[];
}

export const ZenCodeSidebar: React.FC<{ hide: () => void }> = ({ hide }) => {
  const { selectedPatch, patches, visualsCode } = usePatches();
  let zenCode = selectedPatch ? selectedPatch.zenCode : "";
  const account = useAccount();
  const [minting, setMinting] = useState(false);
  const [dropAddress, setDropAddress] = useState<string | null>(null);

  const [parameters, setParameters] = useState<Parameters | null>(null);
  const [price, setPrice] = useState("0");
  const [numEditions, setNumEditions] = useState(30);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  let [opened, setOpened] = useState(true);
  const { switchNetwork } = useSwitchNetwork();

  const { user } = useAuth();
  const { chain } = useNetwork();

  const [screenshot, setScreenshot] = useState<string | null>(null);

  const [compressedDSP, setCompressedDSP] = useState<string | null>(null);
  const [compressedVisuals, setCompressedVisuals] = useState<string | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/deflate", {
      method: "POST",
      body: zenCode,
    }).then(async (x) => {
      let json = await x.json();
      setCompressedDSP(json.compressed);
    });
  }, [zenCode]);

  useEffect(() => {
    if (visualsCode) {
      console.log("visuals code to deflate=", visualsCode);
      console.log("visuals code to deflate=", minify(visualsCode, false));
      fetch("/api/deflate", {
        method: "POST",
        body: minify(visualsCode, false),
      }).then(async (x) => {
        let json = await x.json();
        console.log("deflated visuals");
        console.log(json);
        setCompressedVisuals(json.compressed);
      });
    }
  }, [visualsCode]);

  useEffect(() => {
    if (user && dropAddress && account && patches[0] && chain) {
      // write to firebase
      let document: any = {
        ownerAddress: account.address,
        createdAt: new Date(),
        dropAddress,
        user: user.email,
        name,
        description,
        price,
        numEditions,
        patchId: patches[0].previousDocId,
        image: screenshot,
        chain: chain.id,
        version: 2,
      };
      addDoc(collection(db, "drops"), document).then((snap) => {});
    }
  }, [
    user,
    chain,
    dropAddress,
    name,
    description,
    price,
    numEditions,
    patches,
    screenshot,
  ]);

  useEffect(() => {
    if (!screenshot) {
      let canvases = document.getElementsByClassName("rendered-canvas");
      let canvas = canvases[0];
      console.log("canvas = ", canvas);
      if (canvas) {
        captureAndSendCanvas(canvas as HTMLCanvasElement).then((x) => {
          console.log("setting screenshot ", x);
          setScreenshot("https://zequencer.mypinata.cloud/ipfs/" + x);
        });
      }
    }
  }, [setScreenshot, screenshot]);

  useEffect(() => {
    if (opened && switchNetwork) {
      switchNetwork(zoraSepolia.id);
    }
  }, [opened, switchNetwork]);

  useEffect(() => {
    if (!opened) {
      return;
    }
    let patch = patches[0];
    if (patch) {
      while ((patch as SubPatch).parentPatch) {
        patch = (patch as SubPatch).parentPatch;
      }
    }
    let params = patch
      .getAllNodes()
      .filter((x) => (x as ObjectNode).name === "param");
    let names = [];
    let minValues = [];
    let maxValues = [];
    for (let param of params) {
      if (param.attributes["onchain"]) {
        names.push(param.arguments[0] as string);
        let { max, min } = param.attributes;
        maxValues.push(max === undefined ? 1 : Math.round(max as number));
        minValues.push(min === undefined ? 0 : Math.round(min as number));
      }
    }
    setParameters({
      parameterNames: names,
      maxValues,
      minValues,
    });
  }, [patches, opened, setParameters, minting]);

  console.log("drop address=", dropAddress);
  const inner = React.useMemo(() => {
    console.log("screenshot = ", screenshot);
    let patch = patches[0];
    if (patch) {
      while ((patch as SubPatch).parentPatch) {
        patch = (patch as SubPatch).parentPatch;
      }
    }
    let canvas = patch.getAllNodes().find((x) => x.name === "canvas");
    let fps = 32;
    if (canvas) {
      fps = canvas.attributes["fps"] as number;
    }
    return (
      <div className="w-96 relative">
        <Cross2Icon
          onClick={hide}
          className="absolute top-0 cursor-pointer right-3"
        />

        {dropAddress && (
          <div className="h-32">
            Deployed on{" "}
            <a
              className="underline text-blue-500"
              href={"https://testnet.zora.co/collect/gor:" + dropAddress}
            >
              zora
            </a>{" "}
          </div>
        )}
        {switchNetwork && chain && (
          <div className="flex mb-1">
            <div
              onClick={() => switchNetwork(goerli.id)}
              className={
                "cursor-pointer " +
                (chain.id === goerli.id
                  ? "border-bottom text-white "
                  : " text-zinc-400")
              }
            >
              goerli
            </div>
            <div
              onClick={() => switchNetwork(zoraSepolia.id)}
              className={
                "cursor-pointer " +
                (chain.id === zoraSepolia.id
                  ? "border-bottom text-white "
                  : " text-zinc-400")
              }
            >
              zora testnet
            </div>
            <div
              onClick={() => switchNetwork(zora.id)}
              className={
                "cursor-pointer ml-5 " +
                (chain.id === zora.id
                  ? "border-bottom text-white "
                  : " text-zinc-400")
              }
            >
              zora network
            </div>
          </div>
        )}
        {compressedDSP &&
        compressedVisuals &&
        screenshot &&
        minting &&
        parameters &&
        visualsCode &&
        zenCode &&
        chain ? (
          <MintSound
            chainId={chain.id}
            fps={fps}
            screenshot={screenshot}
            numEditions={numEditions}
            price={parseEther(price)}
            name={name}
            description={description}
            visuals={compressedVisuals}
            parameterNames={parameters.parameterNames}
            minValues={parameters.minValues}
            maxValues={parameters.maxValues}
            setDropAddress={setDropAddress}
            dsp={compressedDSP}
          />
        ) : (
          ""
        )}
        {!account ? (
          <div>
            <ConnectButton />
          </div>
        ) : minting ? (
          <div className="bg-white px-2 py-1 rounded-full text-black cursor-pointer z-30 active:bg-red-500">
            deploying onchain
          </div>
        ) : parameters && visualsCode && zenCode && chain ? (
          <div className="flex flex-col items-start">
            <input
              style={{ borderBottom: "1px solid #2d2d2d" }}
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="Name for work"
              className="px-2 outline-none w-full mb-1 bg-black-clear "
            />
            <textarea
              style={{ borderBottom: "1px solid #2d2d2d" }}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Desciption for work"
              className="px-2 mb-1 outline-none"
            />
            <div className="relative mb-1">
              <input
                style={{ borderBottom: "1px solid #2d2d2d" }}
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  let float = parseFloat(e.target.value);
                  if (
                    e.target.value === "." ||
                    e.target.value === "0." ||
                    e.target.value === ""
                  ) {
                    float = 0;
                  }
                  if (!isNaN(float) && float >= 0) {
                    setPrice(e.target.value);
                  }
                }}
                placeholder="Price"
                className="px-2 outline-none"
              />
              <div className="absolute bottom-1 text-zinc-400 text-xs right-5 z-30">
                eth
              </div>
            </div>
            <div className="relative">
              <input
                style={{ borderBottom: "1px solid #2d2d2d" }}
                value={numEditions}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  let float = parseInt(e.target.value);
                  if (!isNaN(float) && float > 0) {
                    setNumEditions(float);
                  }
                }}
                placeholder="Editions"
                className="px-2 outline-none"
              />
              <div className="absolute text-zinc-400 bottom-1 text-xs right-5 z-30">
                editions
              </div>
            </div>
            <button
              onClick={() => {
                if (name !== "" && description !== "") {
                  setMinting(true);
                }
              }}
              className={
                (name === "" || description === ""
                  ? "opacity-80 blur-sm  pointer-events-none"
                  : "") +
                " bg-clear-button px-2 py-1  cursor-pointer z-30 active:bg-red-500 mt-3"
              }
            >
              Mint Onchain
            </button>
          </div>
        ) : (
          <div className="flex">
            <ul>
              <li>
                missing something screenshot && minting && parameters &&
                visualsCode && zenCode && chain
                {!visualsCode && <div>missing visuals</div>}
                {!screenshot && <div>missing screenshot</div>}
                {!parameters && <div>missing parameters</div>}
                {!zenCode && <div>missing dsp</div>}
                {!chain && <div>missing chain</div>}
              </li>
            </ul>
          </div>
        )}
        <div
          style={{ maxHeight: 100, minHeight: 50 }}
          className="w-full h-full text-xs overflow-scroll relative my-5"
        >
          <pre className="p-1">{zenCode}</pre>
        </div>
        <div className="w-64 h-64 relative border border-zinc-400 overflow-hidden">
          {screenshot && <img src={screenshot} className="h-64" />}
          <CameraIcon
            onClick={() => setScreenshot(null)}
            className="absolute bottom-2 right-2 cursor-pointer"
          />
        </div>
        <ConnectButton />
      </div>
    );
  }, [
    compressedDSP,
    compressedVisuals,
    zenCode,
    setScreenshot,
    dropAddress,
    visualsCode,
    minting,
    parameters,
    name,
    description,
    price,
    numEditions,
    screenshot,
    chain,
    switchNetwork,
  ]);

  return inner;
  /*
    return <div
        style={{ zIndex: 100000000 }}
        onMouseDown={(e: any) => e.stopPropagation()}
        onClick={(e: any) => e.stopPropagation()}
        className={
            "bg-toolbar fixed top-40 right-0 flex sidebar  " + (opened ? "opened-sidebar2 " : "")}
    >
        <div
            onClick={() => {
                setOpened(!opened);
            }}
            style={{
                top: "0px",
                left: "-40px",
            }}

            className="cursor-pointer absolute p-2 w-10 h-10 bg-toolbar sidebar-btn">
            <Share1Icon
                className="w-6 h-6 " />
        </div>
    */
};

// Function to convert base64 to blob
function base64ToBlob(base64: string, mimeType: string) {
  const byteString = atob(base64.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

// Function to capture the canvas and send the image
export function captureAndSendCanvas(
  canvas: HTMLCanvasElement,
  useGoogle?: boolean,
): Promise<string> {
  return new Promise((resolve: (x: string) => void) => {
    // Convert canvas to base64 image
    const base64Image = canvas.toDataURL("image/png");
    console.log(canvas);
    console.log(base64Image);

    // Convert base64 to blob
    const imageBlob = base64ToBlob(base64Image, "image/png");
    console.log(imageBlob);

    // Prepare FormData
    const formData = new FormData();
    formData.append("file", imageBlob, "screenshot.png");

    // Send the image to the server
    fetch(useGoogle ? "/api/uploadImageToGoogle" : "/api/uploadImage", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (useGoogle) {
          resolve(data.url);
        } else {
          console.log("Upload successful", data.data.IpfsHash);
          resolve(data.data.IpfsHash);
        }
      })
      .catch((error) => {
        console.error("Error uploading image:", error);
      });
  });
}
