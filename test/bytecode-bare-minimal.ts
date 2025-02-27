/**
 * Minimal bytecode test suite for testing if, let, lambda and def operations
 * Creates bytecode directly rather than compiling it
 */

import { OpCode, BytecodeFunction } from "../src/lib/lisp/bytecode/opcodes";
import { VM } from "../src/lib/lisp/bytecode/vm";
import { ListPool } from "../src/lib/lisp/ListPool";

// Create mock environment
const env: any = {};

// Add some test values
env["testValue"] = 42;
env["myFunc_fn"] = (e: any) => (...args: number[]) => {
  console.log("myFunc called with args:", args);
  return args.reduce((sum, n) => sum + n, 100);
};

// Create a simple addition function and add to environment
env["+_fn"] = (e: any) => (...args: number[]) => {
  console.log("Addition with args:", args);
  return args.reduce((sum, n) => sum + n, 0);
};

// Create pool
const pool = new ListPool();

// Create VM
const vm = new VM(pool, env);
vm.setDebug(true);

// Create an extremely simple manual bytecode that just returns one constant
const constantBytecode: BytecodeFunction = {
  instructions: [
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },  // Push 1
  ],
  constants: [3],  // Constants pool
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

// A very simple manual bytecode that just pushes two constants
// and returns the last one
const simpleBytecode: BytecodeFunction = {
  instructions: [
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },  // Push 1
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },  // Push 2
  ],
  constants: [1, 2],  // Constants pool
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

// After testing simple bytecode, try this more complex one
const additionBytecode: BytecodeFunction = {
  instructions: [
    { opcode: OpCode.LOAD_FN, operand: "+" },       // Load the + function
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push constant 1
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push constant 2
    { opcode: OpCode.CALL, operand: 2 }             // Call with 2 args
  ],
  constants: [1, 2],  // Constants pool
  symbolNames: ["+"],  // Symbol names
  arity: 0,
  variadic: false,
  patterns: []
};

// Start with the most basic test
console.log("Executing constant bytecode...");
try {
  const constantResult = vm.execute(constantBytecode);
  console.log("Constant Result:", constantResult);
} catch (error) {
  console.error("VM execution error on constant bytecode:", error);
}

// Execute simple bytecode
console.log("\nExecuting simple bytecode (two constants)...");
try {
  const simpleResult = vm.execute(simpleBytecode);
  console.log("Simple Result:", simpleResult);
} catch (error) {
  console.error("VM execution error on simple bytecode:", error);
}

// Test environment access
console.log("\nTesting environment access...");
const envAccessBytecode: BytecodeFunction = {
  instructions: [
    { opcode: OpCode.LOAD, operand: "testValue" },  // Load testValue from env
  ],
  constants: [],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

try {
  const envResult = vm.execute(envAccessBytecode);
  console.log("Environment access result:", envResult);
} catch (error) {
  console.error("VM execution error on env access:", error);
}

// Test function loading
console.log("\nTesting function loading (without calling)...");
const funcLoadBytecode: BytecodeFunction = {
  instructions: [
    { opcode: OpCode.LOAD_FN, operand: "myFunc" },  // Load myFunc from env
  ],
  constants: [],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

try {
  const funcResult = vm.execute(funcLoadBytecode);
  console.log("Function load result:", funcResult);
} catch (error) {
  console.error("VM execution error on function load:", error);
}

// Let's try a simple function call now, with debug info
console.log("\nTesting a simple function call...");

// Test a simple function call - explicitly loading the myFunc and pushing args
const callBytecode: BytecodeFunction = {
  instructions: [
    // Setup
    { opcode: OpCode.LOAD_FN, operand: "myFunc" },  // Load myFunc from env
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push 10
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 20
    
    // Add debugging before call
    { opcode: OpCode.CALL, operand: 2 }             // Call with 2 args
  ],
  constants: [10, 20],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

// Now let's test the addition function too
const addBytecode: BytecodeFunction = {
  instructions: [
    // Setup
    { opcode: OpCode.LOAD_FN, operand: "+" },       // Load + function from env
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push 1
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 2
    
    // Call the function
    { opcode: OpCode.CALL, operand: 2 }             // Call with 2 args
  ],
  constants: [1, 2],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

try {
  console.log("Stack before executing callBytecode:", vm.debugStack());
  const callResult = vm.execute(callBytecode);
  console.log("Function call result:", callResult);
} catch (error) {
  console.error("VM execution error on function call:", error);
}

// Test if statement
console.log("\nTesting if statement (true condition)...");
const ifTrueBytecode: BytecodeFunction = {
  instructions: [
    // Push true condition
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push true
    
    // Jump if false to the else branch
    { opcode: OpCode.JUMP_IF_FALSE, operand: null, offset: 5 },
    
    // Then branch - Push "then result"
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push "then result"
    
    // Jump to end (skip else branch)
    { opcode: OpCode.JUMP, operand: null, offset: 6 },
    
    // Else branch - Push "else result"
    { opcode: OpCode.PUSH_CONSTANT, operand: 2 },   // Push "else result"
  ],
  constants: [true, "then result", "else result"],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

try {
  const ifTrueResult = vm.execute(ifTrueBytecode);
  console.log("If (true condition) result:", ifTrueResult);
} catch (error) {
  console.error("VM execution error on if (true) statement:", error);
}

console.log("\nTesting if statement (false condition)...");
const ifFalseBytecode: BytecodeFunction = {
  instructions: [
    // Push false condition
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push false
    
    // Jump if false to the else branch
    { opcode: OpCode.JUMP_IF_FALSE, operand: null, offset: 5 },
    
    // Then branch - Push "then result"
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push "then result"
    
    // Jump to end (skip else branch)
    { opcode: OpCode.JUMP, operand: null, offset: 6 },
    
    // Else branch - Push "else result"
    { opcode: OpCode.PUSH_CONSTANT, operand: 2 },   // Push "else result"
  ],
  constants: [false, "then result", "else result"],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

try {
  const ifFalseResult = vm.execute(ifFalseBytecode);
  console.log("If (false condition) result:", ifFalseResult);
} catch (error) {
  console.error("VM execution error on if (false) statement:", error);
}

// Test let statement
console.log("\nTesting let statement...");
const letBytecode: BytecodeFunction = {
  instructions: [
    // Store x = 10
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push 10
    { opcode: OpCode.STORE, operand: "x" },         // Store as x
    
    // Store y = 20
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 20
    { opcode: OpCode.STORE, operand: "y" },         // Store as y
    
    // Load x
    { opcode: OpCode.LOAD, operand: "x" },          // Load x
    
    // Load y
    { opcode: OpCode.LOAD, operand: "y" },          // Load y
    
    // Add them
    { opcode: OpCode.LOAD_FN, operand: "+" },       // Load + function
    { opcode: OpCode.CALL, operand: 2 }             // Call with 2 args (x and y)
  ],
  constants: [10, 20],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

try {
  const letResult = vm.execute(letBytecode);
  console.log("Let statement result:", letResult);
} catch (error) {
  console.error("VM execution error on let statement:", error);
}

// Test lambda expression
console.log("\nTesting lambda expression and closure...");

// First, create a lambda function that adds 5 to its argument
const lambdaBytecode: BytecodeFunction = {
  instructions: [
    // Create a lambda function that adds 5 to its argument
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push lambda function
    { opcode: OpCode.STORE, operand: "addFive_fn" }, // Store as addFive_fn
    
    // Call the lambda with argument 10
    { opcode: OpCode.LOAD_FN, operand: "addFive" }, // Load lambda
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 10
    { opcode: OpCode.CALL, operand: 1 }             // Call with 1 arg
  ],
  constants: [
    // Lambda function bytecode
    {
      instructions: [
        { opcode: OpCode.LOAD_FN, operand: "+" },      // Load + function
        { opcode: OpCode.LOAD, operand: "x" },         // Load parameter x
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },  // Push 5
        { opcode: OpCode.CALL, operand: 2 },           // Call + with 2 args
        { opcode: OpCode.RETURN }                       // Return result
      ],
      constants: [5],
      symbolNames: [],
      arity: 1,
      variadic: false,
      patterns: []
    },
    10 // Argument to pass to the lambda
  ],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

try {
  const lambdaResult = vm.execute(lambdaBytecode);
  console.log("Lambda result:", lambdaResult);
} catch (error) {
  console.error("VM execution error on lambda expression:", error);
}

// Test def with pattern matching
console.log("\nTesting def with pattern matching...");

// First, add a helper function to the environment that will handle our pattern
env["greet_fn"] = (e: any) => (obj: any) => {
  console.log("greet_fn called with:", obj);
  const name = obj.name || "stranger";
  return `Hello, ${name}!`;
};

const defBytecode: BytecodeFunction = {
  instructions: [
    // Create a pattern for the greet function
    { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push pattern object
    { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push function body offset
    { opcode: OpCode.PUSH_CONSTANT, operand: 2 },   // Push empty predicates array
    
    // Create pattern array
    { opcode: OpCode.MAKE_LIST, operand: 3 },       // Make pattern object
    
    // Push pattern array containing the pattern
    { opcode: OpCode.PUSH_CONSTANT, operand: 3 },   // Push array with 1 item
    
    // Store patterns in environment
    { opcode: OpCode.STORE, operand: "greet_patterns" }, // Store patterns
    
    // Call the function with { name: "John" }
    { opcode: OpCode.LOAD_FN, operand: "greet" },   // Load the function
    { opcode: OpCode.PUSH_CONSTANT, operand: 4 },   // Push { name: "John" }
    { opcode: OpCode.CALL_PATTERN, operand: 1 }     // Call with pattern matching
  ],
  constants: [
    // Pattern params
    [{ type: "object", properties: { name: { type: "Symbol", value: "name" } } }],
    
    // Body offset
    5,
    
    // Empty predicates array
    [],
    
    // Pattern array with one pattern
    [
      {
        params: [{ type: "object", properties: { name: { type: "Symbol", value: "name" } } }],
        body: 5,
        predicates: []
      }
    ],
    
    // Call argument
    { name: "John" }
  ],
  symbolNames: [],
  arity: 0,
  variadic: false,
  patterns: []
};

// Simple string concatenation function for testing
env["+_fn"] = (e: any) => (...args: any[]) => {
  if (typeof args[0] === 'string') {
    return args.join('');
  }
  return args.reduce((sum, n) => sum + n, 0);
};

try {
  const defResult = vm.execute(defBytecode);
  console.log("Def with pattern matching result:", defResult);
} catch (error) {
  console.error("VM execution error on def with pattern matching:", error);
}