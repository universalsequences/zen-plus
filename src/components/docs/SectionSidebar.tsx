import { Section } from "./sections";

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
      className={`${isSelected ? "underline text-white" : "text-zinc-400"} px-2 py-1 cursor-pointer hover:text-white transition-colors`}
    >
      {name}
    </button>
  );
};
interface Props {
  section: Section | null;
  setSection: React.Dispatch<React.SetStateAction<Section | null>>;
}
const sections = [
  { name: "Intro", section: Section.Intro },
  { name: "Subpatches", section: Section.Subpatches },
  {
    name: "Zen",
    section: Section.Zen,
    subsections: [
      { name: "Basics", section: Section.Zen_Basics },
      { name: "Counting", section: Section.Zen_Counting },
      { name: "Shaping I", section: Section.Zen_Shaping_I },
      { name: "Shaping II", section: Section.Zen_Shaping_II },
      { name: "Feedback", section: Section.Zen_Feedback },
      { name: "Delay", section: Section.Zen_Delay },
    ],
  },
  { name: "GL", section: Section.GL },
  { name: "API", section: Section.API },
];

// Then modify the SectionSidebar component to handle subsections:
export const SectionSidebar = (props: Props) => {
  const { section, setSection } = props;

  const isZenSectionActive = (currentSection: Section | null) => {
    if (!currentSection) return false;
    return (
      currentSection === Section.Zen ||
      currentSection === Section.Zen_Basics ||
      currentSection === Section.Zen_Counting ||
      currentSection === Section.Zen_Shaping_I ||
      currentSection === Section.Zen_Shaping_II ||
      currentSection === Section.Zen_Feedback ||
      currentSection === Section.Zen_Delay
    );
  };

  return (
    <div className="flex flex-col gap-2 w-32 fixed top-32 left-5">
      <img src="/curve2.svg" alt="divider" />
      {sections.map((s, idx) => (
        <div key={s.name}>
          <SectionOption
            section={s.section}
            setSection={setSection}
            name={s.name}
            isSelected={s.section === section}
          />
          {s.subsections && isZenSectionActive(section) && (
            <div className="ml-4 flex flex-col">
              {s.subsections.map((sub) => (
                <SectionOption
                  key={sub.name}
                  section={sub.section}
                  setSection={setSection}
                  name={sub.name}
                  isSelected={sub.section === section}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
