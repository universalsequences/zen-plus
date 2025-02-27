import { describe, it, expect, beforeEach } from "bun:test";
import { OpCode, BytecodeFunction } from "../src/lib/lisp/bytecode/opcodes";
import { VM } from "../src/lib/lisp/bytecode/vm";
import { ListPool } from "../src/lib/lisp/ListPool";

/**
 * Test cases for the bytecode VM focusing on Lisp-like function execution
 */
describe("Bytecode VM Function Tests", () => {
  let vm: VM;
  let env: any;
  let pool: ListPool;
  
  beforeEach(() => {
    pool = new ListPool();
    env = {};
    
    // Add basic arithmetic functions to the environment
    env["add_fn"] = (e: any) => (a: number, b: number) => a + b;
    env["subtract_fn"] = (e: any) => (a: number, b: number) => a - b;
    env["multiply_fn"] = (e: any) => (a: number, b: number) => a * b;
    env["divide_fn"] = (e: any) => (a: number, b: number) => a / b;
    
    // Comparison operators
    env["equals_fn"] = (e: any) => (a: any, b: any) => a === b;
    env["greater_fn"] = (e: any) => (a: number, b: number) => a > b;
    env["less_fn"] = (e: any) => (a: number, b: number) => a < b;
    
    vm = new VM(pool, env);
    vm.setDebug(true); // Enable debugging for all tests
  });

  it("should define and call a simple function", () => {
    // Bytecode that defines a function 'double' that multiplies its parameter by 2
    // and then calls it with the value 21
    const bytecode: BytecodeFunction = {
      instructions: [
        // Define the function: (defun double (x) (* x 2))
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },      // Push function
        { opcode: OpCode.STORE, operand: "double_fn" },    // Store as double_fn
        
        // Call with argument 21: (double 21)
        { opcode: OpCode.LOAD, operand: "double_fn" },     // Load function
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },      // Push 21
        { opcode: OpCode.CALL, operand: 1 }                // Call with 1 arg
      ],
      constants: [
        // Function definition
        {
          instructions: [
            { opcode: OpCode.LOAD_FN, operand: "multiply" },   // Load multiply
            { opcode: OpCode.LOAD, operand: "x" },             // Load parameter x
            { opcode: OpCode.PUSH_CONSTANT, operand: 0 },      // Push 2
            { opcode: OpCode.CALL, operand: 2 },               // Call with 2 args 
            { opcode: OpCode.RETURN }                          // Return result
          ],
          constants: [2],
          symbolNames: [],
          arity: 1,
          variadic: false,
          patterns: [],
          paramNames: ["x"]
        },
        21  // The argument to double
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(bytecode);
    expect(result).toBe(42);  // 21 * 2 = 42
  });

  it("should support higher-order functions", () => {
    // Bytecode for a program that:
    // 1. Defines apply-twice: (defun apply-twice (f x) (f (f x)))
    // 2. Defines add5: (defun add5 (n) (+ n 5))
    // 3. Calls apply-twice with add5 and 3: (apply-twice add5 3)
    
    const bytecode: BytecodeFunction = {
      instructions: [
        // Define apply-twice function
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },          // Push function
        { opcode: OpCode.STORE, operand: "apply_twice_fn" },   // Store as apply_twice_fn
        
        // Define add5 function
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },          // Push function
        { opcode: OpCode.STORE, operand: "add5_fn" },          // Store as add5_fn
        
        // Call apply-twice with add5 and 3
        { opcode: OpCode.LOAD, operand: "apply_twice_fn" },    // Load apply-twice
        { opcode: OpCode.LOAD, operand: "add5_fn" },           // Load add5
        { opcode: OpCode.PUSH_CONSTANT, operand: 2 },          // Push 3
        { opcode: OpCode.CALL, operand: 2 }                    // Call with 2 args
      ],
      constants: [
        // apply-twice function
        {
          instructions: [
            // First apply f to x: (f x)
            { opcode: OpCode.LOAD, operand: "f" },             // Load function parameter
            { opcode: OpCode.LOAD, operand: "x" },             // Load value parameter
            { opcode: OpCode.CALL, operand: 1 },               // Call f(x)
            // Then apply f to the result: (f result)
            { opcode: OpCode.STORE, operand: "inner_result" }, // Store the intermediate result
            { opcode: OpCode.LOAD, operand: "f" },             // Load function again
            { opcode: OpCode.LOAD, operand: "inner_result" },  // Load the intermediate result
            { opcode: OpCode.CALL, operand: 1 },               // Call f with result
            { opcode: OpCode.RETURN }                          // Return final result
          ],
          constants: [],
          symbolNames: [],
          arity: 2,
          variadic: false,
          patterns: [],
          paramNames: ["f", "x"]
        },
        // add5 function
        {
          instructions: [
            { opcode: OpCode.LOAD_FN, operand: "add" },        // Load add function
            { opcode: OpCode.LOAD, operand: "n" },             // Load parameter n
            { opcode: OpCode.PUSH_CONSTANT, operand: 0 },      // Push 5
            { opcode: OpCode.CALL, operand: 2 },               // Call add with 2 args
            { opcode: OpCode.RETURN }                          // Return result
          ],
          constants: [5],
          symbolNames: [],
          arity: 1,
          variadic: false,
          patterns: [],
          paramNames: ["n"]
        },
        3  // The argument to apply-twice
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(bytecode);
    expect(result).toBe(13);  // 3 + 5 + 5 = 13
  });

  it("should support closures with captured variables", () => {
    // Bytecode for a program that:
    // 1. Defines make-adder: (defun make-adder (n) (lambda (x) (+ x n)))
    // 2. Creates add10 by calling make-adder with 10: (let ((add10 (make-adder 10)))
    // 3. Calls add10 with 5: (add10 5)
    
    const bytecode: BytecodeFunction = {
      instructions: [
        // Define make-adder function
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },        // Push function
        { opcode: OpCode.STORE, operand: "make_adder_fn" },  // Store as make_adder_fn
        
        // Create add10 by calling make-adder with 10
        { opcode: OpCode.LOAD, operand: "make_adder_fn" },   // Load make-adder
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },        // Push 10
        { opcode: OpCode.CALL, operand: 1 },                 // Call with 1 arg
        { opcode: OpCode.STORE, operand: "add10_fn" },       // Store result as add10_fn
        
        // Call add10 with 5
        { opcode: OpCode.LOAD, operand: "add10_fn" },        // Load add10
        { opcode: OpCode.PUSH_CONSTANT, operand: 2 },        // Push 5
        { opcode: OpCode.CALL, operand: 1 }                  // Call with 1 arg
      ],
      constants: [
        // make-adder function that returns a lambda with captured variable
        {
          instructions: [
            // Store the input parameter 'n' in a result variable to use in closure
            { opcode: OpCode.LOAD, operand: "n" },          // Load the parameter 'n'
            { opcode: OpCode.STORE, operand: "captured_n" }, // Store n in a variable for closure
            
            // Create and return a lambda function that captures 'n'
            { opcode: OpCode.PUSH_CONSTANT, operand: 0 },    // Push lambda function
            { opcode: OpCode.RETURN }                        // Return lambda
          ],
          constants: [
            // Lambda function: (lambda (x) (+ x n))
            {
              instructions: [
                { opcode: OpCode.LOAD_FN, operand: "add" },  // Load add function
                { opcode: OpCode.LOAD, operand: "x" },       // Load parameter x
                { opcode: OpCode.LOAD, operand: "captured_n" }, // Load the captured variable
                { opcode: OpCode.CALL, operand: 2 },         // Call add with 2 args
                { opcode: OpCode.RETURN }                    // Return result
              ],
              constants: [],
              symbolNames: [],
              arity: 1,
              variadic: false,
              patterns: [],
              paramNames: ["x"]
            }
          ],
          symbolNames: [],
          arity: 1,
          variadic: false,
          patterns: [],
          paramNames: ["n"]
        },
        10, // Argument to make-adder
        5   // Argument to add10
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(bytecode);
    expect(result).toBe(15);  // 10 + 5 = 15
  });

  it("should support recursive functions", () => {
    // Bytecode for a program that:
    // 1. Defines factorial: (defun factorial (n) (if (= n 0) 1 (* n (factorial (- n 1)))))
    // 2. Calls factorial with 5: (factorial 5)
    
    const bytecode: BytecodeFunction = {
      instructions: [
        // Define factorial function
        { opcode: OpCode.PUSH_CONSTANT, operand: 0 },       // Push function
        { opcode: OpCode.STORE, operand: "factorial_fn" },  // Store as factorial_fn
        
        // Call factorial with 5
        { opcode: OpCode.LOAD, operand: "factorial_fn" },   // Load factorial
        { opcode: OpCode.PUSH_CONSTANT, operand: 1 },       // Push 5
        { opcode: OpCode.CALL, operand: 1 }                 // Call with 1 arg
      ],
      constants: [
        // factorial function: factorial(n) = if n == 0 then 1 else n * factorial(n-1)
        {
          instructions: [
            // if (= n 0)
            { opcode: OpCode.LOAD_FN, operand: "equals" },  // Load equals function
            { opcode: OpCode.LOAD, operand: "n" },          // Load parameter n
            { opcode: OpCode.PUSH_CONSTANT, operand: 0 },   // Push 0
            { opcode: OpCode.CALL, operand: 2 },            // Call equals with 2 args
            { opcode: OpCode.JUMP_IF_FALSE, operand: null, offset: 8 }, // Jump to else branch
            
            // Then branch - return 1
            { opcode: OpCode.PUSH_CONSTANT, operand: 1 },   // Push 1 (base case)
            { opcode: OpCode.RETURN },                      // Return 1
            
            // Else branch - return n * factorial(n-1)
            // Step 1: Calculate (n-1)
            { opcode: OpCode.LOAD_FN, operand: "subtract" },// Load subtract function
            { opcode: OpCode.LOAD, operand: "n" },          // Load parameter n
            { opcode: OpCode.PUSH_CONSTANT, operand: 2 },   // Push 1
            { opcode: OpCode.CALL, operand: 2 },            // Call subtract with 2 args -> (n-1)
            { opcode: OpCode.STORE, operand: "n_minus_1" }, // Store (n-1) for reuse
            
            // Step 2: Calculate factorial(n-1)
            { opcode: OpCode.LOAD, operand: "factorial_fn" },// Load factorial function
            { opcode: OpCode.LOAD, operand: "n_minus_1" },  // Load (n-1)
            { opcode: OpCode.CALL, operand: 1 },            // Call factorial(n-1)
            { opcode: OpCode.STORE, operand: "fact_n_minus_1" }, // Store factorial(n-1)
            
            // Step 3: Calculate n * factorial(n-1)
            { opcode: OpCode.LOAD_FN, operand: "multiply" },// Load multiply function
            { opcode: OpCode.LOAD, operand: "n" },          // Load parameter n
            { opcode: OpCode.LOAD, operand: "fact_n_minus_1" }, // Load factorial(n-1) 
            { opcode: OpCode.CALL, operand: 2 },            // Call multiply -> n * factorial(n-1)
            { opcode: OpCode.RETURN }                       // Return result
          ],
          constants: [0, 1, 1],  // The constants: 0 for comparison, 1 for base case, 1 for subtraction
          symbolNames: [],
          arity: 1,
          variadic: false,
          patterns: [],
          paramNames: ["n"]
        },
        5  // Argument to factorial
      ],
      symbolNames: [],
      arity: 0,
      variadic: false,
      patterns: []
    };
    
    const result = vm.execute(bytecode);
    expect(result).toBe(120);  // 5! = 120
  });
});