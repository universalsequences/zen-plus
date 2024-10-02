import React, { useRef, useCallback, useEffect, useState } from "react";
import { ValueProvider } from "@/contexts/ValueContext";
import {  MessageNode } from "@/lib/nodes/types";
import MessageNodeComponent from "./MessageNodeComponent";

const MessageNodeWrapper: React.FC<{ isCustomView?: boolean; messageNode: MessageNode }> = ({
  messageNode,
  isCustomView,
}) => {
  return (
    <ValueProvider node={messageNode}>
      <MessageNodeComponent messageNode={messageNode} isCustomView={isCustomView} />
    </ValueProvider>
  );
};

export default MessageNodeWrapper;
