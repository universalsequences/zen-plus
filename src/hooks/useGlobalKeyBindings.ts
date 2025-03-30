import { useEffect, useCallback, useState } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { useWindows } from "@/contexts/WindowsContext";

export interface KeyCommand {
  key: string;
  type: "ctrl" | "meta";
}

/**
 * Hook for handling global keyboard shortcuts not specific to patches
 * These commands don't require any patch-specific context
 */
export const useGlobalKeyBindings = () => {
  const {
    createDiredBuffer,
    liftPatchTile,
    createBufferListBuffer,
    killCurrentBuffer,
    splitTile,
    selectedBuffer,
  } = usePatches();

  const { setPatchWindows } = useWindows();

  const [keyCommand, setKeyCommand] = useState<KeyCommand | null>(null);

  // Handle keydown events globally
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't handle keyboard input if user is typing in an input or textarea
      if (
        e.target &&
        ((e.target as HTMLElement).tagName.toLowerCase() === "input" ||
          (e.target as HTMLElement).tagName.toLowerCase() === "textarea")
      ) {
        return;
      }

      if (e.metaKey) {
        // Create a Dired (directory browser) buffer when 'd' is pressed
        if (e.key === "d") {
          e.preventDefault();
          createDiredBuffer();
          return;
        }

        // Toggle BufferList buffer when 'b' is pressed
        if (e.key === "b") {
          e.preventDefault();
          createBufferListBuffer();
          return;
        }

        // Kill current buffer and switch to previous when 'k' is pressed
        if (e.key === "k") {
          e.preventDefault();
          killCurrentBuffer();
          return;
        }
      }

      if (e.key === "x" && e.ctrlKey) {
        setKeyCommand({
          type: "ctrl",
          key: "x",
        });
      }

      if (keyCommand?.key === "x") {
        switch (e.key) {
          case "1":
            if (selectedBuffer) {
              liftPatchTile(selectedBuffer);
              setPatchWindows([]);
            }
            break;
          case "2":
            if (selectedBuffer) splitTile("vertical");
            break;
          case "3":
            if (selectedBuffer) splitTile("horizontal");
            break;
        }
        setKeyCommand(null);
      }
    },
    [keyCommand, createDiredBuffer, createBufferListBuffer, killCurrentBuffer, selectedBuffer],
  );

  // Set up the global event listener
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return { keyCommand, setKeyCommand };
};
