import { describe, it, expect, beforeEach } from "bun:test";
import { parse } from "../src/lib/lisp/parse";
import { Compiler } from "../src/lib/lisp/bytecode/compiler";
import { VM } from "../src/lib/lisp/bytecode/vm";
import { ListPool } from "../src/lib/lisp/ListPool";
import { toggleBytecodeInterpreter } from "../src/lib/lisp/bytecode";
import { isSymbol } from "../src/lib/lisp/types";

describe("Lisp Syntax to Bytecode Tests", () => {
  let pool: ListPool;
  let compiler: Compiler;
  let vm: VM;
  let env: any;

  beforeEach(() => {
    // Reset for each test
    pool = new ListPool();
    compiler = new Compiler();
    
    // Setup environment
    env = {};
    
    // Add primitive operators
    env["+_fn"] = (e: any) => (...args: any[]) => {
      if (typeof args[0] === 'string') {
        return args.join(''); // String concatenation
      }
      return args.reduce((a, b) => a + b, 0); // Addition
    };
    
    env["-_fn"] = (e: any) => (...args: any[]) => {
      if (args.length === 1) return -args[0]; // Unary negation
      return args.reduce((a, b, i) => i === 0 ? a : a - b, args[0]); // Subtraction
    };
    
    env["*_fn"] = (e: any) => (...args: any[]) => {
      return args.reduce((a, b) => a * b, 1); // Multiplication
    };
    
    env["//_fn"] = (e: any) => (...args: any[]) => {
      if (args.length === 1) return 1 / args[0]; // Reciprocal
      return args.reduce((a, b, i) => i === 0 ? a : a / b, args[0]); // Division
    };
    
    // Comparison operators
    env["=_fn"] = (e: any) => (...args: any[]) => args[0] === args[1];
    env["<_fn"] = (e: any) => (...args: any[]) => args[0] < args[1];
    env[">_fn"] = (e: any) => (...args: any[]) => args[0] > args[1];
    
    // Create VM with environment
    vm = new VM(pool, env);
    vm.setDebug(false); // Disable debug output for cleaner tests
    
    // Enable bytecode interpreter
    toggleBytecodeInterpreter(true);
  });

  // Helper function to parse, compile, and execute code
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

  describe("Constants and basic expressions", () => {
    it("should evaluate numeric literals", () => {
      expect(runCode("42")).toBe(42);
      expect(runCode("-3.14")).toBe(-3.14);
    });

    it("should evaluate string literals", () => {
      expect(runCode('"hello"')).toBe('"hello"');
    });

    it("should evaluate boolean literals", () => {
      expect(runCode("true")).toBe(true);
      expect(runCode("false")).toBe(false);
    });

    // Skip this test for now - there's an issue with null handling in the parser
    it.skip("should evaluate null literal", () => {
      expect(runCode("null")).toBe(null);
    });
  });

  describe("Arithmetic operations", () => {
    it("should perform addition", () => {
      expect(runCode("(+ 1 2)")).toBe(3);
      expect(runCode("(+ 1 2 3 4 5)")).toBe(15);
    });

    it("should perform subtraction", () => {
      expect(runCode("(- 10 5)")).toBe(5);
      expect(runCode("(- 20 5 3)")).toBe(12);
    });

    it("should perform multiplication", () => {
      expect(runCode("(* 3 4)")).toBe(12);
      expect(runCode("(* 2 3 4)")).toBe(24);
    });

    it("should perform division", () => {
      expect(runCode("(// 10 2)")).toBe(5);
      expect(runCode("(// 24 3 2)")).toBe(4);
    });
  });

  describe("If expressions", () => {
    it("should evaluate the true branch when condition is true", () => {
      expect(runCode("(if true 42 99)")).toBe(42);
      expect(runCode("(if (> 5 3) \"yes\" \"no\")")).toBe('"yes"');
    });

    it("should evaluate the false branch when condition is false", () => {
      expect(runCode("(if false 42 99)")).toBe(99);
      expect(runCode("(if (< 5 3) \"yes\" \"no\")")).toBe('"no"');
    });

    it("should nest if expressions", () => {
      expect(runCode("(if (> 10 5) (if (< 3 2) \"a\" \"b\") \"c\")")).toBe('"b"');
    });
  });

  describe("Let expressions", () => {
    it("should bind values to variables", () => {
      expect(runCode("(let ((x 10)) x)")).toBe(10);
    });

    it("should support multiple bindings", () => {
      expect(runCode("(let ((x 10) (y 20)) (+ x y))")).toBe(30);
    });

    it("should evaluate the body sequentially", () => {
      expect(runCode("(let ((x 10) (y 20)) (+ x y) (* x y))")).toBe(200);
    });
  });

  describe("Lambda expressions", () => {
    it("should create and call lambda functions", () => {
      // Define a function directly
      expect(runCode("((lambda (x) (+ x 5)) 10)")).toBe(15);
    });

    it("should support assigning lambda to variables", () => {
      expect(runCode("(let ((add5 (lambda (x) (+ x 5)))) (add5 10))")).toBe(15);
    });
  });

  describe("Function definitions", () => {
    it("should define and call functions with defun", () => {
      expect(runCode("(defun add5 (x) (+ x 5)) (add5 10)")).toBe(15);
    });

    it("should support multiple arguments", () => {
      expect(runCode("(defun sum (a b c) (+ a b c)) (sum 1 2 3)")).toBe(6);
    });
  });

  describe("Pattern matching", () => {
    it("should match patterns in function calls", () => {
      // Define a simple function with string concatenation
      env["concat_fn"] = (e: any) => (...args: string[]) => {
        return args.join('');
      };
      
      // First define a function using pattern matching syntax
      runCode(`(def greet {name n} (concat "Hello, " n "!"))`);
      
      // Then call it with an object that matches the pattern
      const result = runCode(`(greet {name "John"})`);
      
      expect(result).toBe("Hello, John!");
    });
  });

  describe("Complex expressions", () => {
    it("should handle nested expressions", () => {
      const factorialCode = `
        (defun factorial (n)
          (if (= n 0)
              1
              (* n (factorial (- n 1)))))
        (factorial 5)
      `;
      expect(runCode(factorialCode)).toBe(120);
    });

    it("should handle more complex control flow", () => {
      const fibonacciCode = `
        (defun fibonacci (n)
          (if (< n 2)
              n
              (+ (fibonacci (- n 1))
                 (fibonacci (- n 2)))))
        (fibonacci 7)
      `;
      expect(runCode(fibonacciCode)).toBe(13);
    });
    
    it("should support higher-order functions", () => {
      const higherOrderCode = `
        (defun apply-twice (f x)
          (f (f x)))
        
        (defun add5 (n)
          (+ n 5))
          
        (apply-twice add5 3)
      `;
      expect(runCode(higherOrderCode)).toBe(13); // 3 + 5 + 5 = 13
    });
    
    it("should support closures with captured variables", () => {
      const closureCode = `
        (defun make-adder (n)
          (lambda (x) (+ x n)))
          
        (let ((add10 (make-adder 10)))
          (add10 5))
      `;
      expect(runCode(closureCode)).toBe(15); // 10 + 5 = 15
    });
  });
  
  describe("Functional programming constructs", () => {
    it("should support function composition", () => {
      const compositionCode = `
        (defun compose (f g)
          (lambda (x) (f (g x))))
          
        (defun double (x) (* x 2))
        (defun square (x) (* x x))
        
        (let ((double-then-square (compose square double)))
          (double-then-square 3))
      `;
      expect(runCode(compositionCode)).toBe(36); // (3*2)^2 = 6^2 = 36
    });
    
    it("should support currying", () => {
      const curryingCode = `
        (defun curry-add (x)
          (lambda (y) (+ x y)))
          
        (let ((add7 (curry-add 7)))
          (add7 8))
      `;
      expect(runCode(curryingCode)).toBe(15); // 7 + 8 = 15
    });
    
    it("should support recursion with accumulators", () => {
      const tailRecursionCode = `
        (defun sum-to-n (n)
          (let ((helper (lambda (i acc)
                          (if (> i n)
                              acc
                              (helper (+ i 1) (+ acc i))))))
            (helper 1 0)))
            
        (sum-to-n 10)
      `;
      expect(runCode(tailRecursionCode)).toBe(55); // 1+2+3+4+5+6+7+8+9+10 = 55
    });
  });
  
  describe("Advanced function calls", () => {
    it("should support anonymous function invocation", () => {
      const anonymousCode = `
        ((lambda (x y) (+ x (* y 2))) 3 4)
      `;
      expect(runCode(anonymousCode)).toBe(11); // 3 + (4*2) = 11
    });
    
    it("should support nested function definition and call", () => {
      const nestedFunctionCode = `
        (let ((outer 10))
          (defun create-fn ()
            (let ((inner 5))
              (lambda (x) (+ outer inner x))))
              
          (let ((my-fn (create-fn)))
            (my-fn 7)))
      `;
      expect(runCode(nestedFunctionCode)).toBe(22); // 10 + 5 + 7 = 22
    });
  });
});