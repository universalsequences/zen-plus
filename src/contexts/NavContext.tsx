import { createContext, useEffect, useCallback, useState, useContext } from "react";

export enum NavOption {
  Home,
  Files,
  Editor,
  Docs,
  Works,
}

interface INavContext {
  navOption: NavOption;
  setNavOption: (x: NavOption) => void;
}

const NavContext = createContext<INavContext | undefined>(undefined);

export const useNav = (): INavContext => {
  const context = useContext(NavContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

interface Props {
  children: React.ReactNode;
  showDocs: boolean;
}

export const NavProvider: React.FC<Props> = ({ showDocs, children }) => {
  const [navOption, setNavOption] = useState(showDocs ? NavOption.Docs : NavOption.Home);

  return <NavContext.Provider value={{ navOption, setNavOption }}>{children}</NavContext.Provider>;
};
