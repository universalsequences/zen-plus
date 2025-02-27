/**
 * Minimal test for Lisp interpreter
 */

import { parse } from "../src/lib/lisp/parse";
import { createContext, createTreeWalkingContext } from "../src/lib/lisp/eval";
import { ListPool } from "../src/lib/lisp/ListPool";

// Create a mock object node
const mockObjectNode = { 
  patch: { 
    parentNode: { receive: () => {} }, 
    scriptingNameToNodes: {}
  } 
} as any;

// Create a ListPool
const pool = new ListPool();

// Create the interpreter context
const treeWalkingEvaluate = createTreeWalkingContext(pool, mockObjectNode);

// Parse a simple expression
const ast = parse("(+ 1 2)");

// Create an environment
const env = {};

// Evaluate the expression
const result = treeWalkingEvaluate(ast, env);

// Log the result
console.log("Result of (+ 1 2):", result);

// Test more expressions
const tests = [
  "(+ 1 2)",
  "(* 3 4)",
  "(- 5 2)",
  "(/ 10 2)"
];

for (const test of tests) {
  const ast = parse(test);
  const result = treeWalkingEvaluate(ast, {});
  console.log(`${test} = ${result}`);
}