import React, { useState, useRef, useEffect, useCallback } from "react";
import { usePosition } from "@/contexts/PositionContext";
import { MessageNode, Message, Coordinate } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";

const MessageBox: React.FC<{
  message: Message;
  isSelected: boolean;
  lockedModeRef: React.MutableRefObject<boolean>;
  messageNode: MessageNode;
}> = ({ messageNode, isSelected, lockedModeRef, message }) => {
  const { updateSize } = usePosition();
  const fullDiv = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  let _value =
    typeof message === "string" || typeof message === "number"
      ? message.toString()
      : Array.isArray(message)
        ? JSON.stringify(message)
        : "*message*";

  let [text, setText] = useState<string>(_value);
  let [editing, setEditing] = useState(false);

  /*
  useEffect(() => {
    setText(_value);
  }, [_value, setText]);
  */

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [editing]);

  const onChange = useCallback(
    (e: any) => {
      setText(e.target.value);
    },
    [setText],
  );

  /*
  useEffect(() => {
    if (fullDiv.current) {
      updateSize(messageNode.id, {
        width: fullDiv.current.offsetWidth + 10,
        height: fullDiv.current.offsetHeight,
      });
    }
  }, [text]);
  */

  const enter = useCallback(() => {
    if (text) {
      messageNode.parse(text);
    }
    setEditing(false);
    // send();
    setText(text);
  }, [text, setEditing]);

  useEffect(() => {
    if (!isSelected) {
      setEditing(false);
      enter();
    }
  }, [isSelected, setEditing]);

  const send = () => {
    if (messageNode.message !== undefined) {
      messageNode.receive(messageNode.inlets[1], messageNode.message);
      messageNode.receive(messageNode.inlets[0], "bang");
    }
  };

  const startPosition = useRef<Coordinate | null>(null);

  return (
    <div
      ref={fullDiv}
      onMouseDown={(e: any) => {
        if (lockedModeRef.current) {
          e.stopPropagation();
        }
        startPosition.current = { ...messageNode.position };
      }}
      onClick={(e: any) => {
        e.stopPropagation();
        if (!editing && !lockedModeRef.current && isSelected) {
          if (
            startPosition.current &&
            equalCoordinate(startPosition.current, messageNode.position)
          ) {
            setText(_value);
            setEditing(true);
          }
        }
        if (lockedModeRef.current) {
          send();
        }
      }}
      style={{ maxWidth: 500, overflow: "hidden" }}
      className="text-white py-1 px-2 flex-1 relative w-full"
    >
      {/*<div ref={ref} className="absolute top-0 left-0 invisible">
        {text && text.slice
          ? text.length < 400
            ? text
            : text.slice(0, 400)
          : ""}
          </div>*/}
      {editing ? (
        <input
          ref={inputRef}
          style={
            ref.current
              ? { width: Math.max(36, ref.current.offsetWidth + 1) + "px" }
              : {}
          }
          onKeyDown={(e: any) => {
            if (e.key === "Enter") enter();
          }}
          className="w-16 text-white bg-transparent outline-none"
          value={text}
          onChange={onChange}
          type="text"
        />
      ) : _value && _value.slice ? (
        _value.slice(0, 400)
      ) : (
        ""
      )}
    </div>
  );
};
export default MessageBox;

const equalCoordinate = (a: Coordinate, b: Coordinate): boolean => {
  return a.x === b.x && a.y === b.y;
};
