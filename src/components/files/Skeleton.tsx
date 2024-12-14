import React from "react";
import LogoutButton from "../landing/LogoutButton";
import LoginButton from "@/components/landing/LoginButton";
import Nav from "@/components/landing/Nav";
import { useAuth } from "@/contexts/AuthContext";

const Skeleton: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let { user } = useAuth();

  return (
    <div className="flex flex-1 w-full h-full bg-zinc-900 min-h-screen max-h-screen text-white">
      <div className="min-h-screen w-52 border-r border-r-zinc-900 flex flex-col">
        <div className="text-sm text-zinc-400 p-5 mb-10">{user ? user.email : <LoginButton />}</div>
        <div className="w-40">
          <Nav />
        </div>
        <div className="mt-auto mb-10">
          <LogoutButton />
        </div>
      </div>
      <div style={{}} className="flex flex-1  flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Skeleton;
