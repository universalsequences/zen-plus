import { Section } from "./sections";

interface Props {
  section: Section;
  setSection: React.Dispatch<React.SetStateAction<Section>>;
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
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setSection(section);
      }}
      className={`${isSelected ? "underline" : ""} px-2 py-1`}
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
