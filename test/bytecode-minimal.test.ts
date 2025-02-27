import { describe, it, expect, beforeEach } from "bun:test";
import { parse } from "../src/lib/lisp/parse";
import { Compiler } from "../src/lib/lisp/bytecode/compiler";
import { VM } from "../src/lib/lisp/bytecode/vm";
import { ListPool } from "../src/lib/lisp/ListPool";
import { OpCode, BytecodeFunction } from "../src/lib/lisp/bytecode/opcodes";

describe("Bytecode VM Minimal Tests", () => {
  let pool: ListPool;
  let compiler: Compiler;
  let vm: VM;
  let env: any;

  beforeEach(() => {
    // Setup fresh environment for each test
    pool = new ListPool();
    compiler = new Compiler();
    env = {};
    vm = new VM(pool, env);
    vm.setDebug(false);
    
    // Standard operators
    env["+_fn"] = (e: any) => (...args: any[]) => {
      if (typeof args[0] === 'string') {
        return args.join(''); // String concatenation
      }
      return args.reduce((a, b) => a + b, 0); // Addition
    };
  });
  
  // Helper to create and run bytecode directly
  const runBytecode = (bytecode: BytecodeFunction) => {
    return vm.execute(bytecode);
  };
  
  // Helper to parse, compile and run Lisp code
  const runCode = (code: string, debug = false) => {
    if (debug) {
      console.log(`Executing code: ${code}`);
      vm.setDebug(true);
    }
    
    const ast = parse(code);
    const bytecode = compiler.compile(ast);
    
    if (debug) {
      console.log("Compiled bytecode:", JSON.stringify(bytecode, null, 2));
    }
    
    const result = vm.execute(bytecode);
    
    if (debug) {
      console.log("Result:", result);
      vm.setDebug(false);
    }
    
    return result;
  };

  describe("Basic operations", () => {
    it("should push and return constants", () => {
      // Direct bytecode test
      const bytecode: BytecodeFunction = {
        instructions: [
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 }
        ],
        constants: [42],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(bytecode)).toBe(42);
      
      // Lisp syntax test
      expect(runCode("42")).toBe(42);
    });
    
    it("should load variables from environment", () => {
      // Set up a variable
      env.testVar = 100;
      
      // Direct bytecode test
      const bytecode: BytecodeFunction = {
        instructions: [
          { opcode: OpCode.LOAD, operand: "testVar" }
        ],
        constants: [],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(bytecode)).toBe(100);
    });
    
    it("should store variables in environment", () => {
      // Direct bytecode test for store operation
      const bytecode: BytecodeFunction = {
        instructions: [
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },
          { opcode: OpCode.STORE, operand: "newVar" }
        ],
        constants: [999],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      runBytecode(bytecode);
      expect(env.newVar).toBe(999);
    });
  });

  describe("If statement", () => {
    it("should implement proper if-then-else", () => {
      // If true, return first value
      const ifTrueBytecode: BytecodeFunction = {
        instructions: [
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },           // Push true
          { opcode: OpCode.JUMP_IF_FALSE, operand: null, offset: 4 }, // Jump to else if false
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 },           // Then: Push 'then'
          { opcode: OpCode.JUMP, operand: null, offset: 5 },      // Jump to end
          { opcode: OpCode.PUSH_CONSTANT, operand: 2 }            // Else: Push 'else'
        ],
        constants: [true, "then", "else"],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(ifTrueBytecode)).toBe("then");
      
      // If false, return second value
      const ifFalseBytecode: BytecodeFunction = {
        instructions: [
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },           // Push false
          { opcode: OpCode.JUMP_IF_FALSE, operand: null, offset: 4 }, // Jump to else if false
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 },           // Then: Push 'then'
          { opcode: OpCode.JUMP, operand: null, offset: 5 },      // Jump to end
          { opcode: OpCode.PUSH_CONSTANT, operand: 2 }            // Else: Push 'else'
        ],
        constants: [false, "then", "else"],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(ifFalseBytecode)).toBe("else");
    });
  });

  describe("Simple function calls", () => {
    it("should call native functions", () => {
      // Add a simple add function to the environment
      env.add_fn = (e: any) => (a: number, b: number) => a + b;
      
      // Direct bytecode for a simple function call using LOAD_FN
      const callBytecode: BytecodeFunction = {
        instructions: [
          { opcode: OpCode.LOAD_FN, operand: "add" },    // Load add function
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },  // Push 5
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 },  // Push 10
          { opcode: OpCode.CALL, operand: 2 }            // Call with 2 args
        ],
        constants: [5, 10],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(callBytecode)).toBe(15);
    });
  });

  describe("Let expressions", () => {
    it("should bind variables for the expression scope", () => {
      // Define variables and use them
      const letBytecode: BytecodeFunction = {
        instructions: [
          // Define x = 10
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },  // Push 10
          { opcode: OpCode.STORE, operand: "x" },        // Store as x
          
          // Define y = 20
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 },  // Push 20
          { opcode: OpCode.STORE, operand: "y" },        // Store as y
          
          // Call add function with x and y
          { opcode: OpCode.LOAD_FN, operand: "+" },      // Load + function
          { opcode: OpCode.LOAD, operand: "x" },         // Push x value
          { opcode: OpCode.LOAD, operand: "y" },         // Push y value
          { opcode: OpCode.CALL, operand: 2 }            // Call + with 2 args
        ],
        constants: [10, 20],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(letBytecode)).toBe(30);
    });
  });
  
  describe("Lambda expressions", () => {
    it("should define and call an inline lambda function", () => {
      // First create a lambda function that adds its parameter to a constant
      const addFunction: BytecodeFunction = {
        instructions: [
          { opcode: OpCode.LOAD_FN, operand: "+" },     // Load + function
          { opcode: OpCode.LOAD, operand: "x" },        // Load parameter 
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 }, // Push constant 10
          { opcode: OpCode.CALL, operand: 2 },          // Call + with 2 args
          { opcode: OpCode.RETURN }                     // Return result
        ],
        constants: [10],
        symbolNames: [],
        arity: 1,                // One parameter
        variadic: false,
        patterns: [],
        paramNames: ["x"]        // Parameter name "x"
      };
      
      // Enable debug for this test
      vm.setDebug(true);
      
      // Now create a program that defines and calls this lambda with one argument
      const program: BytecodeFunction = {
        instructions: [
          // Define the lambda function and store it
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push lambda function
          { opcode: OpCode.STORE, operand: "add10_fn" },  // Store as add10_fn
          
          // Call the lambda with argument 5
          { opcode: OpCode.LOAD_FN, operand: "add10" },   // Load the function
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 5
          { opcode: OpCode.CALL, operand: 1 }             // Call with 1 arg
        ],
        constants: [
          addFunction,  // The lambda function
          5             // Argument to the function
        ],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      const result = runBytecode(program);
      vm.setDebug(false);
      
      expect(result).toBe(15);
    });
  });
  
  describe("Function definitions", () => {
    it("should define and call a named function", () => {
      // Program that defines a function and then calls it
      const program: BytecodeFunction = {
        instructions: [
          // Define a function 'addFive' that adds 5 to its argument
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },  // Push function bytecode
          { opcode: OpCode.STORE, operand: "addFive_fn" }, // Store as addFive_fn
          
          // Call the function with argument 10
          { opcode: OpCode.LOAD_FN, operand: "addFive" }, // Load the function
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 10
          { opcode: OpCode.CALL, operand: 1 }             // Call with 1 arg
        ],
        constants: [
          // Function bytecode for addFive
          {
            instructions: [
              { opcode: OpCode.LOAD_FN, operand: "+" },     // Load + function
              { opcode: OpCode.LOAD, operand: "x" },        // Load parameter x
              { opcode: OpCode.PUSH_CONSTANT, operand: 0 }, // Push 5
              { opcode: OpCode.CALL, operand: 2 },          // Call + with 2 args
              { opcode: OpCode.RETURN }                     // Return result
            ],
            constants: [5],
            symbolNames: [],
            arity: 1,
            variadic: false,
            patterns: [],
            paramNames: ["x"]  // Parameter names
          },
          10 // Argument to pass to addFive
        ],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(program)).toBe(15);
    });
    
    // Test recursive function calls
    it("should support recursive function calls", () => {
      // First define factorial function
      const factorialFn: BytecodeFunction = {
        instructions: [
          // if (n == 0) return 1
          { opcode: OpCode.LOAD_FN, operand: "=" },     // Load = function 
          { opcode: OpCode.LOAD, operand: "n" },        // Load parameter n
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 }, // Push 0
          { opcode: OpCode.CALL, operand: 2 },          // Call = with 2 args
          
          // if condition - jump to else if false
          { opcode: OpCode.JUMP_IF_FALSE, operand: null, offset: 9 },
          
          // then: return 1
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 }, // Push 1
          { opcode: OpCode.RETURN },                   // Return 1
          
          // else: return n * factorial(n-1)
          // First calculate n-1
          { opcode: OpCode.LOAD_FN, operand: "-" },     // Load - function
          { opcode: OpCode.LOAD, operand: "n" },        // Load parameter n
          { opcode: OpCode.PUSH_CONSTANT, operand: 2 }, // Push 1
          { opcode: OpCode.CALL, operand: 2 },          // Call - with 2 args: n-1
          
          // Call factorial recursively with n-1
          { opcode: OpCode.LOAD_FN, operand: "factorial" }, // Load factorial function
          { opcode: OpCode.CALL, operand: 1 },          // Call with n-1 arg
          
          // Multiply n * factorial(n-1)
          { opcode: OpCode.LOAD_FN, operand: "*" },     // Load * function
          { opcode: OpCode.LOAD, operand: "n" },        // Load parameter n
          { opcode: OpCode.CALL, operand: 2 },          // Call * with 2 args
          
          { opcode: OpCode.RETURN }                    // Return result
        ],
        constants: [0, 1, 1],
        symbolNames: [],
        arity: 1,
        variadic: false,
        patterns: [],
        paramNames: ["n"]  // Parameter name
      };
      
      // Add comparison and multiplication functions
      env["=_fn"] = (e: any) => (a: number, b: number) => a === b;
      env["-_fn"] = (e: any) => (a: number, b: number) => a - b;
      env["*_fn"] = (e: any) => (a: number, b: number) => a * b;
      
      // Now create a program that defines factorial and calls it
      const program: BytecodeFunction = {
        instructions: [
          // Define the factorial function
          { opcode: OpCode.PUSH_CONSTANT, operand: 0 },    // Push factorial function
          { opcode: OpCode.STORE, operand: "factorial_fn" }, // Store as factorial_fn
          
          // Call factorial(5)
          { opcode: OpCode.LOAD_FN, operand: "factorial" }, // Load factorial function
          { opcode: OpCode.PUSH_CONSTANT, operand: 1 },    // Push 5
          { opcode: OpCode.CALL, operand: 1 }              // Call with 1 arg
        ],
        constants: [
          factorialFn,  // The factorial function
          5             // Argument to factorial
        ],
        symbolNames: [],
        arity: 0,
        variadic: false,
        patterns: []
      };
      
      expect(runBytecode(program)).toBe(120); // factorial(5) = 120
    });
  });
});