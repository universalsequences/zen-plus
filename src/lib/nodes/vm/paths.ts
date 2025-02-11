import type { Node, IOConnection } from "../types";

export interface CompilationPath {
  nodes: Node[];
  connection: IOConnection;
}

const isHot = (x: CompilationPath) => {
  const inletNumber = x.connection.destination.inlets.indexOf(x.connection.destinationInlet);
  return inletNumber === 0 || x.connection.destinationInlet.isHot;
};

export const mergePaths = (paths: CompilationPath[]): CompilationPath[] => {
  for (const path of paths) {
    if (isHot(path)) {
      if (!path.nodes.includes(path.connection.destination)) {
        path.nodes = [...path.nodes, path.connection.destination];
      }
    }
  }

  if (paths.length <= 1) return paths;

  const sortedPaths = [...paths].sort((a, b) => a.nodes.length - b.nodes.length);
  const mergedPaths: CompilationPath[] = [];

  for (const currentPath of sortedPaths) {
    let merged = false;

    for (const existingPath of mergedPaths) {
      const prefixLength = getSharedPrefixLength(existingPath, currentPath);
      if (prefixLength >= 1) {
        const currentSuffix = currentPath.nodes
          .slice(prefixLength)
          .filter(
            (node) => !existingPath.nodes.some((existingNode) => existingNode.id === node.id),
          );

        existingPath.nodes = [...existingPath.nodes, ...currentSuffix];
        merged = true;
        break;
      }
    }

    if (!merged) {
      mergedPaths.push(currentPath);
    }
  }

  return mergedPaths;
};

export function getSharedPrefixLength(path1: CompilationPath, path2: CompilationPath): number {
  const minLength = Math.min(path1.nodes.length, path2.nodes.length);

  for (let prefixLength = minLength; prefixLength >= 0; prefixLength--) {
    let isPrefix = true;
    for (let i = 0; i < prefixLength; i++) {
      if (path1.nodes[i].id !== path2.nodes[i].id) {
        isPrefix = false;
        break;
      }
    }
    if (isPrefix) return prefixLength;
  }

  return 0;
}

// returns true if pathA is subpath of pathB
export const isSubpath = (pathA: CompilationPath, pathB: CompilationPath): boolean => {
  if ([pathA.connection.destination, ...pathA.nodes].every((x) => [...pathB.nodes].includes(x))) {
    return true;
  }
  return false;
};

export const splitPath = (path: CompilationPath, source: Node[]): CompilationPath[] => {
  let paths: Node[][] = [];
  let current: Node[] = [];
  for (let i = 0; i < path.nodes.length; i++) {
    const node = path.nodes[i];
    if (source.includes(node)) {
      if (current.length > 0) {
        paths.push(current);
        current = [];
      }
    }
    current.push(node);
    for (const path of paths) {
      if (
        path.some((x) => x.outlets.some((y) => y.connections.some((c) => c.destination === node)))
      ) {
        path.push(node);
      }
    }
  }
  if (current.length > 0) paths.push(current);
  if (paths.length === 0) {
    return [path];
  }
  return paths.map((n) => ({
    connection: path.connection,
    nodes: n,
  }));
};

export const printPaths = (paths: CompilationPath[], color: string, type: string) => {
  for (const path of paths) {
    console.log(
      "%c %s dest=%s inlet=%s nodes=",
      `color:${color}`,
      type,
      path.connection.destination.id,
      path.connection.destination.inlets.indexOf(path.connection.destinationInlet),
      path.nodes.map((x) => x.id).join(","),
    );
  }
};

export const printNodes = (nodes: Node[], color: string, type: string) => {
  console.log("%c %s  nodes=", `color:${color}`, type, nodes.map((x) => x.id).join(","));
};

export const splitPathByNonCompilableNodes = (path: CompilationPath): Node[][] => {
  const resultPaths: Node[][] = [];
  let currentPathNodes: Node[] = [];

  for (const node of path.nodes) {
    if (node.skipCompilation) {
      if (currentPathNodes.length > 0) {
        currentPathNodes.push(node);
        resultPaths.push(currentPathNodes);
        currentPathNodes = [];
      }
    } else {
      if (!currentPathNodes.some((existingNode) => existingNode === node)) {
        currentPathNodes.push(node);
      }
    }
  }

  if (currentPathNodes.length > 0) {
    resultPaths.push(currentPathNodes);
  }

  console.log("split path into", path, resultPaths);
  return resultPaths;
};
