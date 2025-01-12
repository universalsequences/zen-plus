import type { Node, Patch, IOConnection, ObjectNode, SubPatch, MessageNode, IOlet } from "../types";
import { evaluate } from "./evaluate";
import { createInstructions } from "./instructions";
import {
  type CompilationPath,
  isSubpath,
  splitPath,
  mergePaths,
  printPaths,
  splitPathByNonCompilableNodes,
  printNodes,
} from "./paths";
import { backtrack, getInboundConnections, getOutboundConnections } from "./traversal";

export const compileVM = (patch: Patch) => {
  console.log("%ccompiling vm", "color:lime");
  const allNodes = [...patch.getAllNodes(), ...patch.getAllMessageNodes()].filter((x) => {
    let name = (x as ObjectNode).name;
    if (name === "in" || name === "out" || (x as ObjectNode).subpatch) {
      return false;
    }
    return true;
  });
  for (const node of allNodes) {
    node.instructions = undefined;
  }

  const SOURCE: Node[] = allNodes.filter(
    (x) =>
      //x.inlets.some((x) => x.connections.some((y) => y.source.skipCompilation)) ||
      !x.inlets.some((x) => x.connections.length > 0) &&
      x.outlets.some((y) => y.connections.length > 0),
  );

  console.log("INITIAL SOURCE=", SOURCE);

  let S = [...SOURCE];
  let L: Node[] = [];
  const visitedConnections: Set<IOConnection> = new Set();
  const coldpaths: CompilationPath[] = [];
  const hotpaths: CompilationPath[] = [];

  while (S.length > 0) {
    const n = S.pop();
    if (n) {
      L.push(n);
      const connections = getOutboundConnections(n, visitedConnections);
      console.log("outbound connectiosn for n", n.id, connections);
      for (const m of connections) {
        const { destination, destinationInlet } = m;
        const inletNumber = destination.inlets.indexOf(destinationInlet);
        const isMessage = (destination as MessageNode).messageType !== undefined;
        if (isMessage && inletNumber === 1) {
          // we are message
          const backtracked = backtrack(n, L); //.filter(
          coldpaths.push({
            connection: m,
            nodes: backtracked.includes(destination) ? backtracked : [...backtracked, destination],
          });
          console.log("backtracked from=", destination, backtracked);
          // L = L.filter((x) => x === n || !backtracked.includes(x));
          // back-track from this cold inlet getting list of nodes w/ current L list
        } else if (destinationInlet.isHot) {
          const backtracked = backtrack(n, L);
          console.log("%chotpath backtrack =", "color:red", destination, backtracked);
          hotpaths.push({
            connection: m,
            nodes: backtracked,
          });
        }
        visitedConnections.add(m);
        if (
          destination.inlets.flatMap((x) => x.connections).filter((x) => !visitedConnections.has(x))
            .length === 0
        ) {
          S.push(destination);
        }
      }
    }
  }

  printNodes(L, "red", "topological sort:");

  const realhotpaths: CompilationPath[] = [];
  for (const hotpath of hotpaths) {
    const found = coldpaths.filter((x) => x.nodes.includes(hotpath.connection.destination));
    if (found.length === 0) {
      realhotpaths.push(hotpath);
    }
  }
  const COLDPATHS = coldpaths
    .filter((p1) => ![...coldpaths, ...realhotpaths].some((p2) => p1 !== p2 && isSubpath(p1, p2)))
    .flatMap((h) => splitPath(h, SOURCE));
  const HOTPATHS = realhotpaths
    .filter((p1) => ![...realhotpaths, ...coldpaths].some((p2) => p1 !== p2 && isSubpath(p1, p2)))
    .flatMap((h) => splitPath(h, SOURCE));

  const ALLPATHS = [...COLDPATHS, ...HOTPATHS];

  printPaths(HOTPATHS, "red", "HOT");
  printPaths(COLDPATHS, "yellow", "COLD");

  // so now with the merged paths, we have the topologically sorted nodes needed to execute any source node
  // theres a execution path for each source node
  const MERGEDPATHS = mergePaths([...HOTPATHS, ...COLDPATHS]).flatMap((x) =>
    splitPathByNonCompilableNodes(x),
  );

  console.log("/////////////////////////////////");
  for (const nodes of MERGEDPATHS) {
    printNodes([...nodes], "orange", "OG MERGED");
    while (nodes[0] && (nodes[0] as ObjectNode).needsLoad) {
      nodes.shift();
    }
    const instructions = createInstructions(nodes);
    printNodes([...nodes], "lime", "MERGED");
    console.log("instructions", instructions);
    // evaluate(instructions);

    const source = nodes[0];
    if (source) {
      console.log("STORING IN SOURCE", source.id);
      source.instructions = instructions;
    }
  }
  //evaluate(instructions);
  //console.log("instructions=", instructions);
};

// note: for subpatch connections we need to mark them specially because not only
// do we need to pass thru to the "in 1" node, but we also need to check for attribute messages
// this can be resolved in the instruction
//
// for now just get the connections, we'll leave it to next stage
