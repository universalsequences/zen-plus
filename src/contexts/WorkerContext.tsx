import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useCallback,
  useEffect,
} from "react";

interface IWorkerContext {}

interface Props {
  patch: Patch;
  children: React.ReactNode;
}

const WorkerContext = createContext<IWorkerContext | undefined>(undefined);

export const useWorker = (): IWorkerContext => {
  const context = useContext(WorkerContext);
  if (!context)
    throw new Error("useWorkerHandler must be used within LockedProvider");
  return context;
};

export const WorkerProvider: React.FC<Props> = ({ patch, children }) => {
  console.log("worker provider being called...");
  useEffect(() => {
    console.log("creaiting worker now...");
    const Worker = require("../workers/core.worker.ts").default;
    const worker = new Worker();

    worker.onmessage = (event: MessageEvent) => {
      console.log("received message from worker", event.data);
    };
    worker.postMessage(42); // Send data to the worker
  }, []);

  return <WorkerContext.Provider value={{}}>{children}</WorkerContext.Provider>;
};
