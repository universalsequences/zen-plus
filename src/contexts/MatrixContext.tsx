import type React from "react";
import {
	createContext,
	useState,
	useContext,
	useRef,
	useCallback,
	useEffect,
} from "react";
import { useMessage } from "./MessageContext";
import {
	type Message,
	type ObjectNode,
	SerializedPatch,
} from "@/lib/nodes/types";

interface IValueContext {
	counter: number;
}

interface Props {
	objectNode: ObjectNode;
	children: React.ReactNode;
}

const ValueContext = createContext<IValueContext | undefined>(undefined);

export const useValue = (): IValueContext => {
	const context = useContext(ValueContext);
	if (!context)
		throw new Error("useValueHandler must be used within ValueProvider");
	return context;
};

export const ValueProvider: React.FC<Props> = ({ objectNode, children }) => {
	const matrixRef = useRef<number[]>([]);
	const [counter, setCounter] = useState(0);
	const counterRef = useRef(0);

	const onNewValue = useCallback(
		(value: Message) => {
			setCounter(counterRef.current + 1);
			counterRef.current = counterRef.current + 1;
		},
		[setCounter],
	);

	useEffect(() => {
		objectNode.onNewValue = onNewValue;
	}, []);

	return (
		<ValueContext.Provider
			value={{
				counter,
			}}
		>
			{children}
		</ValueContext.Provider>
	);
};
