import { RefObject } from "react";

interface Props {
  width: number | string;
  height: number | string;
  text: string;
  cursor: number;
  style: any;
}

const findPreviousOpen = (text: string, cursor: number) => {
  let opens = 0;
  for (let i = cursor; i >= 0; i--) {
    const character = text[i];
    if (character === ")") {
      opens++;
    }
    if (character === "(") {
      if (opens === 0) {
        return i;
      }
      opens--;
    }
  }
  return null;
};

const findNextClose = (text: string, cursor: number) => {
  let opens = 0;
  for (let i = cursor; i < text.length; i++) {
    const character = text[i];

    if (character === "(") {
      opens++;
    }
    if (character === ")") {
      if (opens === 0) {
        return i;
      }
      opens--;
    }
  }
  return null;
};

export const Syntax = (props: Props) => {
  const cursor = findPreviousOpen(props.text, props.cursor - 1);
  const closed = findNextClose(props.text, props.cursor);
  const { width, height } = props;
  return (
    <>
      {cursor !== null && closed !== null ? (
        <>
          <span style={{ color: "transparent" }}>{props.text.slice(0, cursor)}</span>
          <span style={{ borderBottom: "1px solid #ffffffaf" }}>
            {props.text.slice(cursor, cursor + 1)}
          </span>
          <span style={{ color: "transparent", backgroundColor: "#ffffff1f" }}>
            {props.text.slice(cursor + 1, closed)}
          </span>
          <span style={{ borderBottom: "solid 1px #ffffffaf" }}>
            {props.text.slice(closed, closed + 1)}
          </span>
          <span>{props.text.slice(closed + 1)}</span>
        </>
      ) : (
        <>{props.text}</>
      )}
    </>
  );
};
