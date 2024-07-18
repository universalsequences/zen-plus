import type { CodeFragment } from "@/lib/zen/emitter";
import type { CodeBlock } from "@/lib/zen/blocks/analyze";
import { getParentContexts } from "@/lib/zen/memo";

function idToColorHSL(id: number): string {
  // Map the ID to a hue between 0 and 360
  id *= 7145983;
  let hue = id % 360;
  // Keep saturation and lightness constant for simplicity
  let saturation = 75;
  let lightness = 50;

  let color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  return color;
}

const AST: React.FC<{
  stack: CodeFragment[];
  blocks: CodeBlock[];
  fragment: CodeFragment;
}> = ({ fragment, blocks, stack = [] }) => {
  let color = idToColorHSL(fragment.context.id);

  if (stack.length > 40) {
    return <></>;
  }
  let parentContexts = fragment.context
    ? getParentContexts(fragment.context)
    : [];
  let firstParent = Array.from(parentContexts)[0];
  let loop = false;
  if (firstParent !== fragment.context) {
    // if fragment.context exists in the rest of the parents then we have a loop
    let restParents = Array.from(parentContexts).slice(1);
    //console.log(firstParent, fragment.context, restParents);
    if (restParents.includes(fragment.context)) {
      loop = true;
    }
  }

  let isLoop = fragment.dependencies.some((x) =>
    stack
      .map((x) => x.context)
      .filter((x) => x !== fragment.context)
      .includes(x.context),
  );
  return (
    <div
      style={
        isLoop
          ? { backgroundColor: "gray", padding: 30 }
          : { borderLeftColor: color }
      }
      className={"flex flex-col items-start border-l relative  "}
    >
      {isLoop && <div className="absolute bottom-0 right-0">LOOP!!!!</div>}
      {
        <div
          style={
            fragment.context && fragment.context.isSIMD
              ? { backgroundColor: "#cfcfcf", padding: 2 }
              : { padding: 2 }
          }
          className="flex"
        >
          <div
            style={{ backgroundColor: idToColorHSL(fragment.context.id) }}
            className="flex p-1 items-start content-start text-black"
          >
            {fragment.id && (
              <div className="rounded-full px-2 bg-zinc-200 text-black mr-2">
                {fragment.id}
              </div>
            )}
            <div>{fragment.variable}</div>
            <div className="ml-5">{fragment.code}</div>
          </div>
          <div
            style={{ backgroundColor: color }}
            className=" mx-3 px-1 text-white mr-2 my-auto"
          >
            context #{fragment.context && fragment.context.id}
          </div>
          {fragment.context && (
            <div
              className={`ml-5 px-2 rounded-full  my-auto ${fragment.context.isSIMD ? "bg-slate-700 text-teal-100" : "bg-zinc-200 text-black"} text-base`}
            >
              {fragment.context.isSIMD ? "simd" : "scalar"}
            </div>
          )}
          {fragment.context &&
          !blocks.some((x) => x.context === fragment.context) ? (
            <div className="px-2 text-red-500 mx-2 my-auto">MISSING</div>
          ) : (
            ""
          )}
          {fragment.context && fragment.context!.historyContext && (
            <div className="bg-black rounded-full px-2 mr-2 my-auto">
              {" "}
              {fragment.context && fragment.context!.historyContext}{" "}
            </div>
          )}
        </div>
      }
      <div className="ml-5">
        {fragment.dependencies.map((f, i) => (
          <AST
            stack={[...stack, fragment]}
            blocks={blocks}
            key={i}
            fragment={f}
          />
        ))}
      </div>
    </div>
  );
};

export default AST;
