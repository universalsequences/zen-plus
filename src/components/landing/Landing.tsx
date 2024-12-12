import React, { useState, useRef, useEffect, useCallback } from "react";
import ShaderBackground from "./ShaderBackground";
import LandingDetails from "./LandingDetails";
import ShaderLanding from "./ShaderLanding";
import LoginButton from "./LoginButton";
import Works from "@/components/works/Works";
import Documentation from "@/components/docs/Documentation";
import Nav from "./Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useNav, NavOption } from "@/contexts/NavContext";
import { GlossaryProvider } from "@/contexts/GlossaryContext";

export const Landing = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { navOption, setNavOption } = useNav();
  const { user, googleSignIn } = useAuth();
  const [showNav, setShowNav] = useState(true);

  let [scrollTop, setScrollTop] = useState(0);
  let [height, setHeight] = useState(1000);

  useEffect(() => {
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [setHeight]);

  const onResize = useCallback(() => {
    setHeight(window.innerHeight);
  }, [setHeight]);

  useEffect(() => {
    setHeight(window.innerHeight);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [setScrollTop, setHeight]);

  const onScroll = useCallback(() => {
    let scrollTop = window.scrollY;
    setScrollTop(scrollTop);
    setHeight(window.innerHeight);
  }, [setScrollTop, setHeight]);

  React.useEffect(() => {
    if (user && navOption === NavOption.Home) {
      setNavOption(NavOption.Files);
    }
  }, [setShowNav, user, navOption]);

  return (
    <GlossaryProvider>
      <div className={"max-w-screen flex bg-black  min-h-screen " + (false ? "light-mode" : "")}>
        {showNav && navOption === NavOption.Docs && (
          <div className="absolute top-10 left-20 h-16 z-30 ">
            <Nav />
          </div>
        )}

        {navOption === NavOption.Home ? (
          <>
            <div ref={scrollRef} className="flex flex-col min-h-screen  relative">
              {showNav && (
                <div className="absolute top-10 left-10  h-16 z-30 ">
                  <Nav />
                </div>
              )}
              <div
                style={{ minHeight: "100vh" }}
                className="flex flex-col  justify-center relative h-full"
              >
                <div
                  style={{ transform: "translate(0, 100px)" }}
                  className="text-6xl text-center w-64 h-64  m-auto flex"
                >
                  <div className="m-auto w-64 h-30  tracking-tight p-5 rounded-3xl overflow-hidden relative flex">
                    <ShaderBackground scrollTop={scrollTop} height={height} />
                    <img className="m-auto z-30" src="zendotdash.svg" />
                  </div>
                </div>
                <LoginButton />
                <div className="absolute bottom-14 md:bottom-5 left-2 md:left-0 p-2 md:p-10 w-80 md:w-96 text-zinc-600">
                  <span className="text-white">zen+</span> is a visual programming environment for
                  creating <span className="text-white">AV</span> works
                </div>
                <div className="absolute bottom-5 right-0 md:right-5 p-10 w-40  text-zinc-600">
                  based on the open-source <span className="text-white">zen</span> programming
                  toolkit
                </div>
              </div>
              <LandingDetails scrollRef={scrollRef} scrollTop={scrollTop} height={height} />
            </div>
          </>
        ) : navOption === NavOption.Docs ? (
          <Documentation />
        ) : (
          <Works setShowNav={setShowNav} />
        )}
      </div>
    </GlossaryProvider>
  );
};
