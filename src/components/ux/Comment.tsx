import { useRef, useEffect, useCallback, useState } from "react";
import { usePosition } from "@/contexts/PositionContext";
import type { ObjectNode } from "@/lib/nodes/types";
import { usePatch } from "@/contexts/PatchContext";

const Comment: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const [text, setText] = useState<string>(objectNode.text.slice("comment".length + 1));
  const { draggingNode, sizeIndex } = usePosition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isCustomView } = usePatch();

  const isDragging = draggingNode?.node === objectNode;

  const handleCommentChange = useCallback(
    (e: any) => {
      setText(e.target.value);
      objectNode.text = "comment " + e.target.value;
    },
    [setText, objectNode],
  );

  let first = useRef(true);
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto"; // Reset height

      // Adjusting for padding and borders if necessary
      const borderTop = parseInt(window.getComputedStyle(textarea).borderTopWidth, 10);
      const borderBottom = parseInt(window.getComputedStyle(textarea).borderBottomWidth, 10);
      const paddingTop = parseInt(window.getComputedStyle(textarea).paddingTop, 10);
      const paddingBottom = parseInt(window.getComputedStyle(textarea).paddingBottom, 10);

      const totalVerticalPaddingAndBorder = borderTop + borderBottom + paddingTop + paddingBottom;

      // Use setTimeout to allow the browser to render the height reset
      //setTimeout(() => {

      if (first.current && objectNode.text.split(" ")[1] === undefined) {
        textarea.style.height = "17";
        first.current = false;
      } else {
        textarea.style.height = "0";
        textarea.style.height = `${Math.max(10, textarea.scrollHeight + 0 * totalVerticalPaddingAndBorder)}px`;
      }
      //}, 0);
    }
  };

  const size = sizeIndex[objectNode.id];

  useEffect(() => {
    adjustHeight();
  }, [text, size]);

  const fontSize = objectNode.attributes["font-size"] as number;
  return (
    <div className="w-full h-full comment">
      <textarea
        readOnly={isCustomView}
        style={
          size
            ? { fontSize: fontSize, lineHeight: fontSize + "px", width: size.width }
            : { fontSize: fontSize, lineHeight: fontSize + "px" }
        }
        ref={textareaRef}
        className={`${isDragging || isCustomView ? "cursor-default" : ""} outline-none bg-transparent text-white p-0.5 border-box overflow-hidden`}
        value={text}
        spellCheck={false}
        onChange={handleCommentChange}
        placeholder="comment"
      />
    </div>
  );
};
export default Comment;
