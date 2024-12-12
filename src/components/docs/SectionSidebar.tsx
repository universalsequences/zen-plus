import { Section } from "./sections";

interface Props {
  section: Section | null;
  setSection: React.Dispatch<React.SetStateAction<Section | null>>;
}

const SectionOption: React.FC<{
  name: string;
  section: Section;
  setSection: (section: Section) => void;
  isSelected: boolean;
}> = ({ section, setSection, name, isSelected }) => {
  return (
    <button
      type="button"
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setSection(section);
      }}
      className={`${isSelected ? "underline text-white" : "text-zinc-400"} px-2 py-1`}
    >
      {name}
    </button>
  );
};

const sections = [
  { name: "Intro", section: Section.Intro },
  { name: "Subpatches", section: Section.Subpatches },
  { name: "Zen", section: Section.Zen },
  { name: "GL", section: Section.GL },
  { name: "API", section: Section.API },
];

export const SectionSidebar = (props: Props) => {
  const { section, setSection } = props;
  return (
    <div className="flex flex-col gap-2 w-32 fixed top-32 left-5">
      <img src="/curve2.svg" />
      {sections.map((s, idx) => (
        <SectionOption
          key={s.name}
          section={s.section}
          setSection={setSection}
          name={s.name}
          isSelected={s.section === section}
        />
      ))}
    </div>
  );
};
