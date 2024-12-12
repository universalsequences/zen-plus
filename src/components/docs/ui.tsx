import { useGlossary } from "@/contexts/GlossaryContext";
import { InfoCircledIcon } from "@radix-ui/react-icons";

export const White: React.FC<{ link?: string; children: React.ReactNode }> = ({
  children,
  link,
}) => {
  const { setSelectedTerm } = useGlossary();
  return (
    <span
      className={`font-bold ${link ? "cursor-pointer hover:underline text-blue-400" : "text-white "}`}
      onClick={() => link && setSelectedTerm(link || "")}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setSelectedTerm(link || "");
        }
      }}
    >
      {children}
    </span>
  );
};
export const P: React.FC<{ className?: string; children: React.ReactNode }> = ({
  children,
  className = "",
}) => (
  <div style={{ maxWidth: 600 }} className={"my-4 " + className}>
    {children}
  </div>
);

export const Core = () => {
  return <span className="table context-type-2 px-2 py-0.5 rounded-full items-start">core</span>;
};

export const AudioNode = () => {
  return (
    <div className="table context-type-1 px-2 py-1 text-black rounded-full items-start">audio</div>
  );
};

export const GL = () => {
  return (
    <div className="table context-type-6 px-2 py-1 text-white rounded-full items-start">GL</div>
  );
};

export const Zen = () => {
  return <div className="table bg-zinc-800 px-2 py-1 text-white rounded-full items-start">zen</div>;
};
export const Card = ({
  info = false,
  children,
  className,
}: { children: React.ReactNode; className?: string; info?: boolean }) => {
  return (
    <div
      className={
        "relative border rounded-lg border-zinc-700 p-6 bg-zinc-900 shadow-sm rounded-lg " +
        className
      }
    >
      {info && <InfoCircledIcon className="w-4 h-4 absolute top-2 left-2" />}
      {children}
    </div>
  );
};
