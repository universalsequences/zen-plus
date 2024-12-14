import { useGlossary } from "@/contexts/GlossaryContext";
import { InfoCircledIcon } from "@radix-ui/react-icons";

export const White: React.FC<{ link?: string; children: React.ReactNode }> = ({
  children,
  link,
}) => {
  const { selectedTerm, setSelectedTerm } = useGlossary();
  return (
    <span
      className={`font-bold ${selectedTerm === link ? "bg-blue-500 text-white" : ""} ${link ? "cursor-pointer hover:underline text-blue-400" : "text-white "}`}
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
  blur = false,
  children,
  className,
}: { children: React.ReactNode; blur?: boolean; className?: string; info?: boolean }) => {
  return (
    <div
      style={
        blur
          ? {
              backgroundColor: "#ffffff36",
              backdropFilter: "blur(8px)",
            }
          : {}
      }
      className={`relative border rounded-lg border-zinc-900 px-8 py-6 ${!blur ? "bg-zinc-950" : ""} shadow-sm rounded-lg ${className}`}
    >
      {info ? (
        <InfoCircledIcon className="w-4 h-4 absolute top-2 left-2" />
      ) : (
        <div className="text-teal-500 absolute top-6 text-xl left-2">+</div>
      )}

      {children}
    </div>
  );
};

// For inline code snippets
export const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-sm text-zinc-100">
    {children}
  </code>
);

// For code blocks
export const CodeBlock = ({ children }: { children: React.ReactNode }) => (
  <pre className="bg-zinc-800 p-4 rounded-lg overflow-x-auto font-mono text-sm text-zinc-100">
    <code className="block">{children}</code>
  </pre>
);
