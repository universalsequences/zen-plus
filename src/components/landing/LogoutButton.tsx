import React from "react";
import { NavOption, useNav } from "@/contexts/NavContext";
import { useAuth } from "@/contexts/AuthContext";

const LogoutButton = () => {
  const { user, logout } = useAuth();
  const { setNavOption } = useNav();

  if (!user) {
    return <></>;
  }
  return (
    <button
      onClick={() => {
        logout().then(() => {
          setNavOption(NavOption.Home);
        });
      }}
      className="text-zinc-300 cursor-pointer relative px-6 py-1 bg-zinc-700 border rounded-full m-auto flex"
    >
      logout
    </button>
  );
};

export default LogoutButton;
