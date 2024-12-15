import React from "react";
import { useNav, NavOption } from "@/contexts/NavContext";

const NavOptions = () => {
  const { setNavOption, navOption } = useNav();
  return (
    <div className="flex flex-col">
      {navOption === NavOption.Files ? (
        <Option name="Patches" option={NavOption.Files} />
      ) : (
        <Option name="Home" option={NavOption.Home} />
      )}
      <Option name="Docs" option={NavOption.Docs} />
      <Option name="Works" option={NavOption.Works} />
    </div>
  );
};

const Option: React.FC<{ option: NavOption; name: string }> = ({ name, option }) => {
  const { setNavOption, navOption } = useNav();
  return (
    <div
      onClick={() => setNavOption(option)}
      className={
        (navOption === option ? "text-zinc-100" : "text-zinc-500") +
        " mr-10 cursor-pointer hover:text-white transition-colors"
      }
    >
      {name}
    </div>
  );
};

export default NavOptions;
