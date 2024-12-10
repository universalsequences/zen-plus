import React, { createContext, useState, useContext, useRef, useEffect } from "react";

interface ISettings {
  lightMode: boolean;
  setLightMode: (x: boolean) => void;
}

interface Props {
  children: React.ReactNode;
}

const SettingsContext = createContext<ISettings | undefined>(undefined);

export const useSettings = (): ISettings => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

export const SettingsProvider: React.FC<Props> = ({ children }) => {
  let [lightMode, setLightMode] = useState(true);
  let loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) {
      window.localStorage.setItem("light-mode", JSON.stringify(lightMode));
    }
  }, [lightMode]);

  useEffect(() => {
    if (!loaded.current) {
      let item = window.localStorage.getItem("light-mode");
      if (item) {
        let l = JSON.parse(item);
        setLightMode(l);
      } else if (item === undefined || item === null) {
        setLightMode(false);
      }
      loaded.current = true;
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        lightMode,
        setLightMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
