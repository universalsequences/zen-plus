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
        console.log("adding to hot path", path.connection.destination.id, path.nodes);
        path.nodes = [...path.nodes, path.connection.destination];
      }
    }
  }
  if (paths.length <= 1) return paths;

  const sortedPaths = paths.sort((a, b) => a.nodes.length - b.nodes.length);
  const mergedPaths: CompilationPath[] = [];

  for (const currentPath of sortedPaths) {
    let merged = false;

    for (const existingPath of mergedPaths) {
      if (arePathsSharePrefix(existingPath, currentPath)) {
        mergePathNodes(existingPath, currentPath);
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

function arePathsSharePrefix(path1: CompilationPath, path2: CompilationPath): boolean {
  const minLength = Math.min(path1.nodes.length, path2.nodes.length);

  for (let i = 0; i < minLength; i++) {
    if (path1.nodes[i].id !== path2.nodes[i].id) {
      return false;
    }
  }

  return true;
}

function mergePathNodes(basePath: CompilationPath, pathToMerge: CompilationPath): void {
  const prefixLength = basePath.nodes.length;

  for (let i = prefixLength; i < pathToMerge.nodes.length; i++) {
    basePath.nodes.push(pathToMerge.nodes[i]);
  }
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
