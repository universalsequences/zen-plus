"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Intro } from "./Intro";

import { White, Core, AudioNode, P } from "./ui";
import { Section } from "./sections";
import { SectionSidebar } from "./SectionSidebar";
import { Other } from "./Other";
import { APIs } from "./APIs";
import { Subpatches } from "./Subpatches";
import { Zen } from "./Zen";

const Documentation = () => {
  const [section, setSection] = useState<Section>(Section.Intro);
  const getSection = (section: Section) => {
    switch (section) {
      case Section.Intro:
        return <Intro />;
      case Section.API:
        return <APIs />;
      case Section.Subpatches:
        return <Subpatches />;
      case Section.Zen:
        return <Zen />;
      default:
        return <Other />;
    }
  };
  return (
    <div className="pl-40 pt-10 overflow-scroll max-h-screen w-full text-zinc-200 ">
      <SectionSidebar section={section} setSection={setSection} />
      <div style={{ maxWidth: 900 }}>{getSection(section)}</div>
    </div>
  );
};

export default Documentation;
