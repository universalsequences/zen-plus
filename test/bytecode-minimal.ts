/**
 * Minimal test for bytecode Lisp interpreter
 */

import { parse } from "../src/lib/lisp/parse";
import { BytecodeInterpreter, toggleBytecodeInterpreter } from "../src/lib/lisp/bytecode";
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

// Create interpreter
const interpreter = new BytecodeInterpreter(pool, mockObjectNode);

// Enable debug mode
interpreter.setDebug(true);

// Test function
function testExpression(expr: string) {
  console.log(`\nTesting: ${expr}`);
  try {
    // First with tree-walking (shouldAlwaysWork)
    toggleBytecodeInterpreter(false);
    const treeResult = interpreter.evaluate(expr, {});
    console.log(`Tree-walking result: ${treeResult}`);
    
    // Then with bytecode (when it's ready)
    /*
    toggleBytecodeInterpreter(true);
    const bytecodeResult = interpreter.evaluate(expr, {});
    console.log(`Bytecode result: ${bytecodeResult}`);
    
    // Compare results
    console.log(`Results match: ${treeResult === bytecodeResult}`);
    */
    
    return treeResult;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// Test basic expressions
console.log("\n===== TESTING BASIC EXPRESSIONS =====");

testExpression("(+ 1 2)");
testExpression("(* 3 4)");
testExpression("(- 5 2)");
testExpression("(/ 10 2)");

console.log("\nAll tests complete!");