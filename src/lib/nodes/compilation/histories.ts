import { Operator, Statement } from "../definitions/zen/types";

export const sortHistories = (statements: Statement[]): Statement[] => {
  let histories = statements.slice(1);
  let historyPairs: any[] = [];
  for (let h of histories) {
    let _h = getAllHistories(h as Statement[]);
    historyPairs.push([h, Array.from(new Set(_h))]);
  }

  let sorted: any[] = historyPairs.sort((a, b) => a[1].length - b[1].length);

  return ["s", ...sorted.map((x) => x[0])] as Statement[];
};

export const getAllHistories = (
  statement: Statement[],
  visited: Set<string> = new Set(),
): any[] => {
  let node = (statement as Statement).node;
  if (node) {
    if (visited.has(node.id)) {
      return [];
    }
    visited.add(node.id);
  }
  let histories: any[] = [];
  if (statement[0] && (statement[0] as any).name === "history") {
    histories.push((statement[0] as any).history);
  }
  for (let i = 1; i < statement.length; i++) {
    histories.push(...getAllHistories(statement[i] as Statement[], visited));
  }
  return histories;
};
