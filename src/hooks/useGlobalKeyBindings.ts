import { useEffect, useCallback } from "react";
import { usePatches } from "@/contexts/PatchesContext";

/**
 * Hook for handling global keyboard shortcuts not specific to patches
 * These commands don't require any patch-specific context
 */
export const useGlobalKeyBindings = () => {
  const { createDiredBuffer, createBufferListBuffer, killCurrentBuffer, selectedBuffer } =
    usePatches();

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

      if (!e.metaKey) return;

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
    },
    [createDiredBuffer, createBufferListBuffer, killCurrentBuffer, selectedBuffer],
  );

  // Set up the global event listener
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);
};
