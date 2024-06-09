import { type Message, SerializedPatch } from "@/lib/nodes/types";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type MessageIndex = {
  [id: string]: Message;
};

interface IMessageContext {
  messages: MessageIndex;
  onNewMessage: (id: string, value: Message) => void;
}

interface Props {
  children: React.ReactNode;
}

const MessageContext = createContext<IMessageContext | undefined>(undefined);

export const useMessage = (): IMessageContext => {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

export const MessageProvider: React.FC<Props> = ({ children }) => {
  const [messages, setMessages] = useState<MessageIndex>({});
  const messagesIndex = useRef<MessageIndex>(messages);

  const onNewMessage = useCallback(
    (id: string, message: Message) => {
      const _messagesIndex = { ...messagesIndex.current };
      _messagesIndex[id] = message;
      messagesIndex.current = _messagesIndex;
      setMessages(_messagesIndex);
    },
    [],
  );

  return (
    <MessageContext.Provider
      value={{
        messages,
        onNewMessage,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
