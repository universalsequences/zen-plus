/**
 * Simple test script for the Lisp bytecode interpreter
 * This tests basic arithmetic operations
 */

import { BytecodeInterpreter, toggleBytecodeInterpreter } from "../src/lib/lisp/bytecode";
import { ListPool } from "../src/lib/lisp/ListPool";
import { parse } from "../src/lib/lisp/parse";

// Mock Object Node
const mockObjectNode = { 
  patch: { 
    parentNode: { receive: () => {} }, 
    scriptingNameToNodes: {}
  } 
} as any;

// Create interpreter
const pool = new ListPool();
const interpreter = new BytecodeInterpreter(pool, mockObjectNode);

// Enable debug mode
interpreter.setDebug(true);

// Test function
function testExpression(expression: string, expectedResult?: any) {
  console.log(`\n\n===== Testing: ${expression} =====`);
  try {
    const result = interpreter.evaluate(expression, {});
    console.log(`Result: ${result}`);
    
    if (expectedResult !== undefined) {
      if (result === expectedResult) {
        console.log("✅ Test passed");
      } else {
        console.log(`❌ Test failed! Expected: ${expectedResult}, Got: ${result}`);
      }
    }
    return result;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

// Run tests with tree-walking interpreter first
console.log("\n\n==========================================");
console.log("  RUNNING TESTS WITH TREE-WALKING INTERPRETER");
console.log("==========================================\n");

// Make sure bytecode is disabled
toggleBytecodeInterpreter(false);

// Run just the simplest test
console.log("\n==== ADDITION TEST ====\n");

testExpression("(+ 1 2)", 3);

// Now try with bytecode interpreter (if enabled)
const enableBytecode = false; // Set to true when ready to test bytecode

if (enableBytecode) {
  console.log("\n\n==========================================");
  console.log("  RUNNING TESTS WITH BYTECODE INTERPRETER");
  console.log("==========================================\n");
  
  // Enable bytecode interpreter
  toggleBytecodeInterpreter(true);
  
  // Run the same tests
  console.log("\n==== SIMPLE ARITHMETIC TESTS ====\n");
  
  testExpression("(+ 1 2)", 3);
  // Add more tests as they start working
} else {
  console.log("\n\n==========================================");
  console.log("  BYTECODE INTERPRETER TESTS SKIPPED");
  console.log("  Set enableBytecode = true to test");
  console.log("==========================================\n");
}

console.log("\nAll tests complete!");