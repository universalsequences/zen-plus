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

    // Create VM with environment
    vm = new VM(pool, env);
    vm.setDebug(false); // Disable debug output for cleaner tests

    // Enable bytecode interpreter
    toggleBytecodeInterpreter(true);
  });

  // Helper function to parse, compile, and execute code
  const runCode = (code: string, debug = false) => {
    vm.setDebug(debug);
    if (debug) {
      console.log(`Executing code: ${code}`);
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

  describe("Arithmetic operations", () => {
    it("should perform addition", () => {
      expect(runCode("(+ 11 22)")).toBe(33);
      expect(runCode("(+ 1 2 3)")).toBe(6);
    });
    it("should perform subtraction", () => {
      expect(runCode("(- 21 22)")).toBe(-1);
      expect(runCode("(- 10 2 3)")).toBe(5);
    });
    it("should perform multiplication", () => {
      expect(runCode("(* 1 2)")).toBe(2);
    });
    it("should perform nested arithmetic", () => {
      expect(runCode("(* 4 (+ 2 3))")).toBe(20);
    });
  });

  describe("Variables", () => {
    it("should perform addition on variables", () => {
      expect(runCode("(set x 5) (+ x 22)")).toBe(27);
    });

    it("should evaluate functions", () => {
      expect(runCode("(defun sq (x) (* x x)) (sq 5)")).toBe(25);
    });

    it("should evaluate let statements", () => {
      expect(runCode("(let ((y 5) (z 5)) (+ y z))")).toBe(10);
    });

    it("should evaluate functions in let statements", () => {
      expect(runCode("(defun sum (a b) (+ a b)) (let ((y 5) (z 5)) (sum y z))")).toBe(10);
    });
  });

  describe("Lambda", () => {
    it("should perform lambdas", () => {
      expect(runCode("((lambda (x) (* x x)) 5)")).toBe(25);
    });

    it("should pass lambdas as arguments", () => {
      expect(runCode("((lambda (fn) (fn 5)) (lambda (y) (+ y y)))")).toBe(10);
    });
  });

  describe("Advanced function calls", () => {
    it("should support anonymous function invocation", () => {
      const anonymousCode = `
       ((lambda (x y) (+ x (* 2 y))) 3 4)
      `;
      expect(runCode(anonymousCode)).toBe(11); // 3 + (4*2) = 11
    });

    it.skip("should support nested function definition and call", () => {
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

  describe("If expressions", () => {
    it("should evaluate the true branch when condition is true", () => {
      expect(runCode("(if true 42 99)")).toBe(42);
      expect(runCode('(if (> 5 3) "yes" "no")')).toBe('"yes"');
    });

    it("should evaluate the false branch when condition is false", () => {
      expect(runCode("(if false 42 99)")).toBe(99);
      expect(runCode('(if (< 5 3) "yes" "no")')).toBe('"no"');
    });

    it("should nest if expressions", () => {
      expect(runCode('(if (> 10 5) (if (< 3 2) "a" "b") "c")')).toBe('"b"');
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
      expect(runCode(compositionCode, true)).toBe(36); // (3*2)^2 = 6^2 = 36
    });

    it.skip("should support currying", () => {
      const curryingCode = `
        (defun curry-add (x)
          (lambda (y) (+ x y)))

        (let ((add7 (curry-add 7)))
          (add7 8))
      `;
      expect(runCode(curryingCode)).toBe(15); // 7 + 8 = 15
    });

    it.skip("should support recursion with accumulators", () => {
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
});
