import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUpIcon } from "@radix-ui/react-icons";
import { usePosition } from "@/contexts/PositionContext";
import { usePatch } from "@/contexts/PatchContext";

const Assistant = () => {
  const { patch, assist } = usePatch();

  const { updatePositions } = usePosition();
  let [showAssist, setShowAssist] = useState(true);
  let [assistText, setAssistText] = useState("");
  let [loading, setLoading] = useState(false);

  let textareaRef = useRef<HTMLTextAreaElement | null>(null);
  let first = useRef(true);
  useEffect(() => {
    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        // Reset height to a minimum value to get the correct scrollHeight
        if (first.current) {
          textarea.style.height = "20";
          first.current = false;
        } else {
          textarea.style.height = "0";
          textarea.style.height = `${Math.max(textarea.scrollHeight, 20)}px`; // Replace 20 with your single line height
        }
      } else {
      }
    };

    // Adjust height initially and on every value change
    adjustHeight();
    window.addEventListener("resize", adjustHeight); // Adjust height on window resize for responsiveness

    return () => {
      window.removeEventListener("resize", adjustHeight);
    };
  }, [assistText, showAssist]);

  useEffect(() => {
    if (textareaRef.current) {
    }
  }, []);
  return (
    <div className="flex relative w-full">
      {!showAssist && (
        <button
          onClick={() => {
            setShowAssist(true);
          }}
          className="bg-white text-black px-2 mr-2 cursor-pointer"
        >
          assist.
        </button>
      )}
      {showAssist && (
        <div
          style={{ backgroundColor: "#595959c2", zIndex: 1000000 }}
          className="flex flex-col  w-64 p-4 items-start"
        >
          {patch.assistant.messages.length > 0 && (
            <div style={{ maxHeight: 200 }} className="flex flex-col overflow-scroll w-full">
              {patch.assistant.messages.map((x, i) => (
                <div key={i} className="flex flex-col w-full text-xs">
                  <div className="">{x.role === "assistant" ? "applied to patch" : x.message}</div>
                  <div className="text-zinc-400 text-xs ml-auto">
                    {x.role === "assistant" ? "assistant" : "you"}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col w-full">
            <textarea
              style={{ maxHeight: 200, overflowY: "scroll" }}
              ref={textareaRef}
              className="rounded-lg pr-10 pl-2 w-full bg-zinc-800 outline-none text-xs py-4 my-2"
              placeholder="what do you wanna build?"
              value={assistText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setAssistText(e.target.value)
              }
            />
            <button
              onClick={() => {
                setLoading(true);
                let text = assistText;
                setAssistText("");
                assist(text).then((x) => {
                  setLoading(false);
                  let positions: any = [];
                  for (let obj of x) {
                    positions[obj.id] = obj.position;
                  }
                  updatePositions(positions);
                });
              }}
              className="absolute bottom-8 right-3 rounded-lg bg-white text-black p-1 mr-2 cursor-pointer"
            >
              {" "}
              {loading ? (
                <div className="lds-ring">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              ) : (
                <ArrowUpIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assistant;
