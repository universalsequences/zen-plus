import React, { useEffect, useCallback, useState } from "react";
import { downloadStringAsFile } from "@/utils/download";
import { captureAndSendCanvas, ZenCodeSidebar } from "./ZenCodeSidebar";
import { useNav, NavOption } from "@/contexts/NavContext";
import { useAuth } from "@/contexts/AuthContext";
import * as Switch from "@radix-ui/react-switch";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import LoadProject from "./LoadProject";
import * as Dialog from "@radix-ui/react-dialog";
import SavePatch from "./storage/SavePatch";
import { useStorage } from "@/contexts/StorageContext";
import { useSettings } from "@/contexts/SettingsContext";
import { DropdownMenu } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { Patch, SubPatch } from "@/lib/nodes/types";
import { storePatch } from "@/lib/saving/storePatch";
const jsonpatch = require("fast-json-patch");

enum Option {
  Save,
  Load,
  CustomPresentation,
  Settings,
  Export,
}

interface Props {
  patch: Patch;
  children: React.ReactNode;
}

const PatchDropdown = React.memo((props: Props) => {
  const [open, setOpen] = useState<boolean | undefined>();
  const [option, setOption] = useState<Option | null>(null);
  const { patch, children } = props;
  let [name, setName] = useState(patch.name);
  const { setLightMode, lightMode } = useSettings();

  let account = useAccount();
  const { setNavOption } = useNav();

  useEffect(() => {
    setName(name);
  }, [patch.name]);

  let isSubPatch: boolean = (patch as SubPatch).parentPatch !== undefined;

  const save = useCallback(() => {
    // first save the image to ipfs
    if (name && user && user.email) {
      let canvases = document.getElementsByClassName("rendered-canvas");
      let canvas = canvases[0];
      console.log("canvas = ", canvas);
      if (canvas) {
        captureAndSendCanvas(canvas as HTMLCanvasElement, true).then((screenshot) => {
          if (name) {
            storePatch(name, patch, isSubPatch, user.email, screenshot);
          }
        });
      } else {
        storePatch(name, patch, isSubPatch, user.email);
      }
      setOption(null);
    }
  }, [patch, name, isSubPatch, setOption, account]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOption, setOpen, option, name, patch]);

  const onKeyDown = useCallback(
    (e: any) => {
      if (e.key === "o" && e.metaKey) {
        e.preventDefault();
        setOption(Option.Load);
      } else if (e.key === "s" && e.metaKey) {
        e.preventDefault();
        setOption(Option.Save);
      } else if (e.key === "Enter" && option === Option.Save) {
        save();
      }
    },
    [setOption, setOpen, option, name, patch],
  );

  const customPresentation = useCallback(() => {
    let parentNode = (patch as SubPatch).parentNode;
    if (parentNode) {
      parentNode.setAttribute("Custom Presentation", !parentNode.attributes["Custom Presentation"]);
      parentNode.size = {
        width: 300,
        height: 300,
      };
    }
  }, [patch]);

  const downloadAudioUnit = useCallback(() => {
    if (patch.exportedAudioUnit) {
      let unit = patch.exportedAudioUnit;
      downloadStringAsFile("engine.c", unit.engineC);
      downloadStringAsFile("engine.h", unit.engineH);
      downloadStringAsFile("BaseAudioUnit.mm", unit.baseAudioUnitMM);
      downloadStringAsFile("BaseAudioUnit.h", unit.baseAudioUnitHeader);
      downloadStringAsFile("AudioUnit.mm", unit.audioUnitMM);
      downloadStringAsFile("AudioUnit.h", unit.baseAudioUnitHeader);
    }
  }, [patch]);

  const { logout, user } = useAuth();

  return (
    <div className="my-auto w-6 h-6 flex">
      {/*compressed && name && <WriteOnchain isSubPatch={isSubPatch} setTokenId={setTokenId} previousTokenId={isSubPatch ? 0 : patch.previousTokenId} compressed={compressed} name={name} />*/}
      <Dialog.Root open={option !== null}>
        <DropdownMenu.Root open={open}>
          <DropdownMenu.Trigger>
            <button className="IconButton" aria-label="Customise options">
              {children}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            style={{ zIndex: 10000000000000000 }}
            color="indigo"
            className="bg-zinc-800  text-zinc-200 w-40 py-3 DropdownMenuContent text-sm"
            sideOffset={5}
          >
            <Dialog.Trigger>
              <DropdownMenu.Item
                onClick={() => {
                  let p = patch;
                  while ((p as SubPatch).parentPatch) {
                    p = (p as SubPatch).parentPatch;
                  }
                  for (let o of p.objectNodes) {
                    if (o.subpatch) {
                      o.subpatch.objectNodes = [];
                      o.subpatch.messageNodes = [];
                      console.log("wet");
                      o.subpatch.recompileGraph();
                      o.subpatch.disconnectGraph();
                    }
                  }
                  p.previousDocId = undefined;
                  p.previousSerializedPatch = undefined;
                  p.objectNodes = [];
                  p.messageNodes = [];
                  window.history.pushState(null, "", `/`);
                  setNavOption(NavOption.Files);
                }}
                className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
              >
                Go to Patches{" "}
                <div className="RightSlot">
                  <ArrowLeftIcon className="w-5 h-5" />
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  console.log("onc lick called for save");
                  setOption(Option.Save);
                }}
                className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
              >
                Save <div className="RightSlot">⌘+S</div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => {
                  console.log("onc lick called for load");
                  setOption(Option.Load);
                }}
                className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
              >
                Load <div className="RightSlot">⌘+O</div>
              </DropdownMenu.Item>
              {isSubPatch && (
                <DropdownMenu.Item
                  onClick={() => {
                    console.log("onc lick called for load");
                    customPresentation();
                    setOption(null); //Option.CustomPresentation);
                  }}
                  className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
                >
                  {(patch as SubPatch).parentNode.attributes["Custom Presentation"]
                    ? "Disable Custom Presentation"
                    : "Enable Custom Presentation"}
                </DropdownMenu.Item>
              )}
              {
                <DropdownMenu.Item
                  onClick={() => {
                    setOption(Option.Settings);
                  }}
                  className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
                >
                  Settings
                </DropdownMenu.Item>
              }
              {isSubPatch && (
                <DropdownMenu.Item
                  onClick={() => {
                    setOption(Option.Export); //Option.CustomPresentation);
                  }}
                  className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
                >
                  Export To NFT
                </DropdownMenu.Item>
              )}
              {patch.exportedAudioUnit && (
                <DropdownMenu.Item
                  onClick={() => {
                    downloadAudioUnit();
                  }}
                  className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
                >
                  Export To AudioUnit
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item
                onClick={() => {
                  let p = patch as SubPatch;
                  while (p.parentPatch) {
                    p = p.parentPatch as SubPatch;
                  }
                  for (let x of p.objectNodes) {
                    if (x.subpatch) {
                      x.subpatch.disconnectGraph();
                    }
                  }
                  logout().then(() => {
                    setNavOption(NavOption.Home);
                  });
                }}
                className="DropdownMenuItem flex cursor-pointer pointer-events-auto"
              >
                Logout
              </DropdownMenu.Item>
            </Dialog.Trigger>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <Dialog.Portal>
          <Dialog.Overlay className="center-fixed" />
          <Dialog.Content
            onInteractOutside={() => setOption(null)}
            style={{ zIndex: 10000000 }}
            className="center-fixed dark-modal  p-5 text-white rounded-lg outline-none"
          >
            {option === Option.Export ? (
              <ZenCodeSidebar hide={() => setOption(null)} />
            ) : option === Option.Settings ? (
              <div className="flex flex-col">
                <div className="text-base">Settings</div>
                <div>
                  <form>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <label className="Label" htmlFor="airplane-mode" style={{ paddingRight: 15 }}>
                        Light Mode
                      </label>
                      <Switch.Root
                        onCheckedChange={(e: boolean) => {
                          setLightMode(e);
                        }}
                        checked={lightMode}
                        className="SwitchRoot"
                        id="airplane-mode"
                      >
                        <Switch.Thumb className="SwitchThumb" />
                      </Switch.Root>
                    </div>
                  </form>
                </div>
                <Dialog.Close asChild>
                  <button
                    onClick={() => setOption(null)}
                    className="bg-black mt-3 px-2 py-1 text-white rounded-full"
                  >
                    Close
                  </button>
                </Dialog.Close>
              </div>
            ) : option === Option.CustomPresentation ? (
              <>
                <div style={{ display: "flex", marginTop: 25, justifyContent: "flex-end" }}>
                  <Dialog.Close asChild>
                    <button
                      onClick={customPresentation}
                      className="bg-black px-2 py-1 text-white rounded-full"
                    >
                      Custom
                    </button>
                  </Dialog.Close>
                </div>
              </>
            ) : option === Option.Save ? (
              <SavePatch patch={patch} hide={() => setOption(null)} />
            ) : (
              <>
                <LoadProject hide={() => setOption(null)} isSubPatch={isSubPatch} patch={patch} />
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
});

PatchDropdown.displayName = "PatchDropdown";
export default PatchDropdown;
