import { ListPool } from "../src/lib/lisp/ListPool";
import { BytecodeInterpreter } from "../src/lib/lisp/bytecode";
import { createTreeWalkingContext, createContext } from "../src/lib/lisp/eval";
import { parse } from "../src/lib/lisp/parse";
import type { Environment } from "../src/lib/lisp/types";

// Mock Object Node
const mockObjectNode = { 
  patch: { 
    parentNode: { receive: () => {} }, 
    scriptingNameToNodes: {}
  } 
} as any;

// Test cases for benchmarking
const testCases = [
  {
    name: "Simple Arithmetic",
    code: "(+ 1 (* 2 3) (/ 10 2))"
  },
  {
    name: "Recursive Fibonacci",
    code: `
      (defun fib (n)
        (if (< n 2)
            n
            (+ (fib (- n 1)) (fib (- n 2)))))
      (fib 10)
    `
  },
  {
    name: "List Manipulation",
    code: `
      (defun map-square (lst)
        (map (lambda (x) (* x x)) lst))
      (map-square (list 1 2 3 4 5 6 7 8 9 10))
    `
  },
  {
    name: "Object Manipulation",
    code: `
      (defun transform-point (p)
        (set x (* (get p "x") 2))
        (set y (+ (get p "y") 10))
        { x x y y z (+ x y) })
      (transform-point { x 5 y 7 })
    `
  },
  {
    name: "Function Composition",
    code: `
      (defun compose (f g)
        (lambda (x) (f (g x))))
      (defun double (x) (* 2 x))
      (defun increment (x) (+ 1 x))
      (set doubleThenIncrement (compose increment double))
      (set incrementThenDouble (compose double increment))
      (doubleThenIncrement 5)
    `
  },
  {
    name: "Let Binding",
    code: `
      (defun complex-calculation (n)
        (let ((a (* n 2))
              (b (+ n 3))
              (c (- n 1)))
          (+ (* a b) (/ c 2))))
      (complex-calculation 10)
    `
  },
  {
    name: "Deep Recursion",
    code: `
      (defun sum (n)
        (if (<= n 0)
            0
            (+ n (sum (- n 1)))))
      (sum 50)
    `
  }
];

// Function to run a benchmark
function runBenchmark(name: string, fn: () => void, iterations: number): number {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = performance.now();
  const duration = end - start;
  
  return duration;
}

// Main benchmark function
async function main() {
  const pool = new ListPool();
  const bytecodeInterpreter = new BytecodeInterpreter(pool, mockObjectNode);
  const treeWalkingEvaluate = createTreeWalkingContext(pool, mockObjectNode);
  const bytecodeEvaluate = createContext(pool, mockObjectNode);
  
  console.log("=".repeat(80));
  console.log("Lisp Interpreter Benchmark");
  console.log("=".repeat(80));
  
  const iterations = 50;
  
  for (const testCase of testCases) {
    console.log(`\nTest Case: ${testCase.name}`);
    console.log("-".repeat(60));
    
    const ast = parse(testCase.code);
    
    // Warmup
    treeWalkingEvaluate(ast, {});
    bytecodeEvaluate(ast, {});
    
    // Benchmark tree-walking interpreter
    const treeWalkingTime = runBenchmark(
      "Tree-walking Interpreter",
      () => {
        treeWalkingEvaluate(ast, {});
        pool.releaseUsed();
      },
      iterations
    );
    
    // Benchmark bytecode interpreter
    const bytecodeTime = runBenchmark(
      "Bytecode Interpreter",
      () => {
        bytecodeEvaluate(ast, {});
        pool.releaseUsed();
      },
      iterations
    );
    
    console.log(`Tree-walking: ${treeWalkingTime.toFixed(2)}ms (${(treeWalkingTime / iterations).toFixed(2)}ms per iteration)`);
    console.log(`Bytecode: ${bytecodeTime.toFixed(2)}ms (${(bytecodeTime / iterations).toFixed(2)}ms per iteration)`);
    
    const speedup = treeWalkingTime / bytecodeTime;
    console.log(`Speedup: ${speedup.toFixed(2)}x (${((speedup - 1) * 100).toFixed(2)}% faster)`);
  }
  
  console.log("\n" + "=".repeat(80));
}

// Run the benchmark
main().catch(console.error);