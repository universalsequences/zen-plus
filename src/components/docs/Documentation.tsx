"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Intro } from "./Intro";

import { White, Core, AudioNode, P } from "./ui";
import { Section } from "./sections";
import { SectionSidebar } from "./SectionSidebar";
import { Other } from "./Other";
import { APIs } from "./APIs";
import { Subpatches } from "./Subpatches";
import { Zen } from "./Zen";
import { useGlossary } from "@/contexts/GlossaryContext";
import { GlossaryDefinition } from "./GlossaryDefinition";
import { GL } from "./GL";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Basics } from "./ZenTutorial/Basics";
import { Counting } from "./ZenTutorial/Counting";
import { Shaping } from "./ZenTutorial/Shaping";
const Documentation = () => {
  const { selectedTerm, setSelectedTerm } = useGlossary();
  const [section, setSection] = useState<Section | null>(Section.Intro);

  const getSection = (section: Section | null) => {
    switch (section) {
      case Section.Intro:
        return <Intro />;
      case Section.API:
        return <APIs />;
      case Section.Subpatches:
        return <Subpatches />;
      case Section.Zen:
        return <Zen />;
      case Section.GL:
        return <GL />;
      case Section.Zen_Basics:
        return <Basics />;
      case Section.Zen_Shaping:
        return <Shaping />;
      case Section.Zen_Counting:
        return <Counting />;
      default:
        return <div />;
    }
  };
  return (
    <div className="pl-40 pt-10 overflow-scroll max-h-screen w-full text-zinc-200 ">
      <SectionSidebar section={section} setSection={setSection} />

      {selectedTerm && (
        <div
          className="w-full fixed bottom-0 left-0 z-30 animate-slide-up"
          style={{
            animation: "slideUp 0.3s ease-out forwards",
          }}
        >
          <button
            onClick={() => setSelectedTerm(null)}
            className="p-2 absolute top-2 right-2 cursor-pointer z-30 rounded-xl hover:bg-zinc-800"
          >
            <Cross2Icon className="z-30 w-5 h-5" />
          </button>
          <GlossaryDefinition blur={true} name={selectedTerm} />
          <style jsx>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
      <div style={{ maxWidth: 1100 }}>{getSection(section)}</div>
    </div>
  );
};

export default Documentation;
