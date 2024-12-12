import { glossary, type GlossaryItem } from "@/lib/docs/glossary";
import { Card, P } from "./ui";
import { useGlossary } from "@/contexts/GlossaryContext";
import * as zen from "@/lib/nodes/definitions/zen/doc";
import * as gl from "@/lib/nodes/definitions/gl/doc";
import * as audio from "@/lib/nodes/definitions/audio/doc";
import * as core from "@/lib/nodes/definitions/core/doc";
import type { Definition } from "@/lib/docs/docs";

export const GlossaryDefinition = ({ name }: { name: string }) => {
  const { setSelectedTerm } = useGlossary();
  const item: GlossaryItem | Definition =
    glossary[name] || core.api[name] || zen.api[name] || gl.api[name] || audio.api[name];
  if (!item) return null;

  const definition = item.definition || (item as unknown as Definition).description;

  const renderDefinitionText = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/);
    return parts.map((part, i) => {
      if (part.startsWith("[[") && part.endsWith("]]")) {
        const term = part.slice(2, -2);
        return (
          <button
            key={`${term}-${i}`}
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

  return (
    <Card className="w-full p-4">
      <h3 className="text-xl font-semibold mb-2">{name}</h3>
      {Array.isArray(definition) ? (
        <div className="list-disc pl-4 space-y-2">
          {definition.map((def, i) => (
            <P key={`${name}-def-${i}`}>{renderDefinitionText(def)}</P>
          ))}
        </div>
      ) : (
        <P>{renderDefinitionText(definition)}</P>
      )}
    </Card>
  );
};
