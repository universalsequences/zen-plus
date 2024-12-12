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

const Documentation = () => {
  const { selectedTerm, setSelectedTerm } = useGlossary();
  const [section, setSection] = useState<Section | null>(Section.Intro);

  useEffect(() => {
    if (selectedTerm) {
      setSection(null);
    }
  }, [selectedTerm]);

  useEffect(() => {
    if (section !== null) {
      setSelectedTerm(null);
    }
  }, [section]);

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
      default:
        return <div />;
    }
  };
  return (
    <div className="pl-40 pt-10 overflow-scroll max-h-screen w-full text-zinc-200 ">
      <SectionSidebar section={section} setSection={setSection} />

      {selectedTerm ? (
        <GlossaryDefinition name={selectedTerm} />
      ) : (
        <div style={{ maxWidth: 900 }}>{getSection(section)}</div>
      )}
    </div>
  );
};

export default Documentation;
