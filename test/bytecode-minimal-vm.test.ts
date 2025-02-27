import { describe, it, expect, beforeEach } from "bun:test";
import { OpCode, BytecodeFunction } from "../src/lib/lisp/bytecode/opcodes";
import { VM } from "../src/lib/lisp/bytecode/vm";
import { ListPool } from "../src/lib/lisp/ListPool";

describe("Bytecode VM Minimal Tests", () => {
  let vm: VM;
  let env: any;
  let pool: ListPool;
  
  beforeEach(() => {
    pool = new ListPool();
    env = {};
    
    // Add simple functions to the environment
    env["add_fn"] = (e: any) => (a: number, b: number) => a + b;
    
    vm = new VM(pool, env);
    vm.setDebug(true); // Enable debug for all tests
  });
  
  it("should execute a simple function call with arguments", () => {
    // Very simple bytecode that calls add(10, 20)
    const bytecode: BytecodeFunction = {
      instructions: [
        { opcode: OpCode.LOAD_FN, operand: "add" },     // Load add function
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push 10
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 20
        { opcode: OpCode.CALL, operand: 2 }             // Call with 2 args
      ],
      constants: [10, 20], 
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(bytecode);
    expect(result).toBe(30);
  });
  
  it("should define and call a VM function", () => {
    // Let's trace the execution of the VM bytecode function
    
    // Here we're defining a very simple function that just returns a constant value
    // This avoids any complexity with calling other functions
    const simpleFn: BytecodeFunction = {
      instructions: [
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push 42 
        { opcode: OpCode.RETURN }                       // Return it
      ],
      constants: [42],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: [],
      paramNames: []
    };
    
    // Test program that defines and calls this simple function
    const program: BytecodeFunction = {
      instructions: [
        // Define the function
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },      // Push function
        { opcode: OpCode.STORE, operand: "simple_fn" },    // Store as simple_fn
        
        // Call the function
        { opcode: OpCode.LOAD, operand: "simple_fn" },     // Load function - FIXED: was LOAD_FN, operand: "simple"
        { opcode: OpCode.CALL, operand: 0 }                // Call with 0 args
      ],
      constants: [
        simpleFn  // The function
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    // Run with debug turned on
    vm.setDebug(true);
    const result = vm.execute(program);
    
    // Should return 42
    expect(result).toBe(42);
  });
  
  it("should define and call a VM function with parameters", () => {
    // Function that adds its parameters
    const addFn: BytecodeFunction = {
      instructions: [
        { opcode: OpCode.LOAD_FN, operand: "add" },    // Load add function
        { opcode: OpCode.LOAD, operand: "x" },         // Load first parameter
        { opcode: OpCode.LOAD, operand: "y" },         // Load second parameter
        { opcode: OpCode.CALL, operand: 2 },           // Call add with 2 args
        { opcode: OpCode.RETURN }                      // Return result
      ],
      constants: [],
      symbolNames: [],
      arity: 2,
      variadic: false,
      patterns: [],
      paramNames: ["x", "y"]  // Named parameters
    };
    
    // Test program that defines and calls the function with parameters
    const program: BytecodeFunction = {
      instructions: [
        // Define the function
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push function
        { opcode: OpCode.STORE, operand: "add_two_fn" },// Store as add_two_fn
        
        // Call the function with args
        { opcode: OpCode.LOAD, operand: "add_two_fn" }, // Load function
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 5
        { opcode: OpCode.PUSH_CONSTANT, operand: 2 },   // Push 7
        { opcode: OpCode.CALL, operand: 2 }             // Call with 2 args
      ],
      constants: [
        addFn, 5, 7  // The function and args
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(program);
    expect(result).toBe(12);  // 5 + 7 = 12
  });
  
  it("should create and call a lambda", () => {
    // Lambda function that multiplies a value by 2
    const lambdaFn: BytecodeFunction = {
      instructions: [
        { opcode: OpCode.LOAD_FN, operand: "multiply" },// Load multiply function
        { opcode: OpCode.LOAD, operand: "x" },          // Load parameter
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push 2
        { opcode: OpCode.CALL, operand: 2 },            // Call multiply with 2 args
        { opcode: OpCode.RETURN }                       // Return result
      ],
      constants: [2],
      symbolNames: [],
      arity: 1,
      variadic: false,
      patterns: [],
      paramNames: ["x"]  // Named parameter
    };
    
    // Add multiply function
    env["multiply_fn"] = (e: any) => (a: number, b: number) => a * b;
    
    // Test program that creates and uses the lambda
    const program: BytecodeFunction = {
      instructions: [
        // Define the lambda
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push lambda function
        { opcode: OpCode.STORE, operand: "double_fn" }, // Store as double_fn
        
        // Call the lambda with arg
        { opcode: OpCode.LOAD, operand: "double_fn" },  // Load lambda
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 21
        { opcode: OpCode.CALL, operand: 1 }             // Call with 1 arg
      ],
      constants: [
        lambdaFn, 21  // The lambda and arg
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(program);
    expect(result).toBe(42);  // 21 * 2 = 42
  });
  
  it("should support function closures with captured variables", () => {
    // Test program that creates a closure and calls it
    const program: BytecodeFunction = {
      instructions: [
        // Define a base value in the environment
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },     // Push 10
        { opcode: OpCode.STORE, operand: "base" },        // Store as 'base'
        
        // Define a closure function that adds 'base' to its argument
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },     // Push closure function
        { opcode: OpCode.STORE, operand: "addBase_fn" },  // Store as 'addBase_fn'
        
        // Call the closure with an argument
        { opcode: OpCode.LOAD, operand: "addBase_fn" },   // Load closure
        { opcode: OpCode.PUSH_CONSTANT, operand: 2 },     // Push 5
        { opcode: OpCode.CALL, operand: 1 }               // Call with 1 arg
      ],
      constants: [
        10,  // Base value
        // Closure function that captures 'base'
        {
          instructions: [
            { opcode: OpCode.LOAD_FN, operand: "add" },     // Load add function
            { opcode: OpCode.LOAD, operand: "base" },       // Load the captured 'base' value
            { opcode: OpCode.LOAD, operand: "x" },          // Load the function parameter
            { opcode: OpCode.CALL, operand: 2 },            // Call add with 2 args
            { opcode: OpCode.RETURN }                       // Return result
          ],
          constants: [],
          symbolNames: [],
          arity: 1,
          variadic: false, 
          patterns: [],
          paramNames: ["x"]
        },
        5  // Function argument
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(program);
    expect(result).toBe(15);  // 10 + 5 = 15
  });
});