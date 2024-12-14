import { glossary, type GlossaryItem } from "@/lib/docs/glossary";
import { Card, P, White } from "./ui";
import { useGlossary } from "@/contexts/GlossaryContext";
import * as zen from "@/lib/nodes/definitions/zen/doc";
import * as gl from "@/lib/nodes/definitions/gl/doc";
import * as audio from "@/lib/nodes/definitions/audio/doc";
import * as core from "@/lib/nodes/definitions/core/doc";
import type { Definition } from "@/lib/docs/docs";

export const GlossaryDefinition = ({ name, blur = false }: { name: string; blur?: boolean }) => {
  const { setSelectedTerm } = useGlossary();
  const item: GlossaryItem | Definition =
    glossary[name] || core.api[name] || zen.api[name] || gl.api[name] || audio.api[name];
  if (!item) return null;

  const definition = item.definition || (item as unknown as Definition).description;
  const inletNames = (item as unknown as Definition).inletNames;
  const outletNames = (item as unknown as Definition).outletNames;

  const getOperatorType = () => {
    if (name === "message" || name === "zen") return null;
    if (core.api[name]) return "core";
    if (zen.api[name]) return "zen";
    if (gl.api[name]) return "gl";
    if (audio.api[name]) return "audio";
    return null;
  };

  const renderDefinitionText = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/);
    return parts.map((part, i) => {
      if (part.startsWith("[[") && part.endsWith("]]")) {
        const term = part.slice(2, -2);
        return (
          <button
            type="button"
            key={term}
            className="text-blue-400 hover:text-blue-300 hover:underline"
            onClick={() => setSelectedTerm(term)}
          >
            {term}
          </button>
        );
      }
      return part;
    });
  };

  const operatorType = getOperatorType();

  return (
    <Card className="w-full p-4" blur={blur}>
      <h3 className="text-xl font-semibold">{name}</h3>
      <div className="opacity-20 text-xs mb-2 italic">definition</div>
      {operatorType && (
        <P>
          An <White link="operator">operator</White> of type{" "}
          <White link="operatorType">{operatorType}</White>
        </P>
      )}
      {Array.isArray(definition) ? (
        <div className="list-disc pl-4 space-y-2">
          {definition.map((def) => (
            <P key={def}>{renderDefinitionText(def)}</P>
          ))}
        </div>
      ) : (
        <P>
          <span className="text-zinc-500">Description:</span> {renderDefinitionText(definition)}
        </P>
      )}
      {inletNames && inletNames.length > 0 && (
        <P>
          <span className="text-zinc-500">Inlets:</span>{" "}
          {inletNames.map((name, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {name}
            </span>
          ))}
        </P>
      )}
      {outletNames && outletNames.length > 0 && (
        <P>
          <span className="text-zinc-500">Outlets:</span>{" "}
          {outletNames.map((name, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {name}
            </span>
          ))}
        </P>
      )}
    </Card>
  );
};
