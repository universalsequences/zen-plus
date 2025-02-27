import { parse } from '../parse';
import { Compiler } from './compiler';
import { VM } from './vm';
import { ListPool } from '../ListPool';
import { operators } from '../operators';
import { ObjectNode } from '@/lib/nodes/types';
import { createTreeWalkingContext } from '../eval';
import type { Message, Environment, LocatedExpression } from '../types';

export class BytecodeInterpreter {
  private compiler: Compiler;
  private vm: VM;

  constructor(
    private pool: ListPool,
    private objectNode: ObjectNode
  ) {
    // Create a compiler instance
    this.compiler = new Compiler();
    
    // Initialize the VM with an empty environment
    this.vm = new VM(pool, {} as Environment);
  }

  /**
   * Create a context for evaluating Lisp expressions
   */
  createContext(): (expressions: LocatedExpression[], env: Environment) => Message {
    // Setup built-in operators
    const operatorFns = operators(this.evaluateExpression.bind(this), this.pool, this.objectNode);
    
    // Return a function that evaluates expressions in a given environment
    return (expressions: LocatedExpression[], env: Environment): Message => {
      // Create a VM with the environment and operators
      const vmEnv = { ...env };
      
      // Add operators to the environment
      for (const [name, op] of Object.entries(operatorFns)) {
        vmEnv[`${name}_fn`] = op;
      }
      
      // Create a fresh VM with the environment
      this.vm = new VM(this.pool, vmEnv);
      
      // Use the bytecode flag to control whether we use bytecode or tree-walking
      if (!bytecodeEnabled) {
        // For now, use the tree-walking interpreter while we debug the bytecode one
        const treeWalking = createTreeWalkingContext(this.pool, this.objectNode);
        return treeWalking(expressions, vmEnv);
      }
      
      try {
        // Compile the expressions to bytecode
        const bytecode = this.compiler.compile(expressions);
        
        // Enable debugging for development
        this.vm.setDebug(true);
        
        // Execute the bytecode
        const result = this.vm.execute(bytecode);
        
        // Clean up pooled memory
        this.pool.releaseUsed();
        
        return result;
      } catch (error) {
        console.error("Bytecode interpreter error:", error);
        
        // Fallback to tree-walking interpreter on error
        const treeWalking = createTreeWalkingContext(this.pool, this.objectNode);
        return treeWalking(expressions, vmEnv);
      }
    };
  }

  /**
   * Evaluate a single expression in an environment
   * Used by operators that need to evaluate arguments
   */
  private evaluateExpression(
    locatedExpression: LocatedExpression,
    env: Environment,
    index: number = 1
  ): Message {
    // Safety check for undefined expressions
    if (!locatedExpression) {
      return null;
    }
    
    // Use the global bytecode flag
    if (!bytecodeEnabled) {
      // Use the tree-walking approach for single expressions for now
      const treeWalking = createTreeWalkingContext(this.pool, this.objectNode);
      return treeWalking([locatedExpression], env);
    }
    
    try {
      // Create a mini AST with just this expression
      const miniAst = [locatedExpression];
      
      // Compile and execute the single expression
      const bytecode = this.compiler.compile(miniAst);
      
      // Create a VM with the environment
      const vm = new VM(this.pool, env);
      
      // Execute the bytecode
      return vm.execute(bytecode);
    } catch (error) {
      console.error("Error evaluating expression:", error);
      // Use tree-walking as fallback
      const treeWalking = createTreeWalkingContext(this.pool, this.objectNode);
      return treeWalking([locatedExpression], env);
    }
  }

  /**
   * Parse and evaluate a string of Lisp code
   */
  evaluate(code: string, env: Environment): Message {
    const ast = parse(code);
    const evaluate = this.createContext();
    return evaluate(ast, env);
  }

  /**
   * Enable or disable debug mode
   */
  setDebug(debug: boolean): void {
    this.vm.setDebug(debug);
  }
}

// Flag to enable/disable bytecode interpreter
let bytecodeEnabled = false;

// Function to toggle bytecode interpreter
export function toggleBytecodeInterpreter(enable?: boolean): boolean {
  if (enable !== undefined) {
    bytecodeEnabled = enable;
  } else {
    bytecodeEnabled = !bytecodeEnabled;
  }
  return bytecodeEnabled;
}

// Export a factory function to create interpreters
export function createBytecodeInterpreter(
  pool: ListPool,
  objectNode: ObjectNode
): (code: string, env: Environment) => Message {
  const interpreter = new BytecodeInterpreter(pool, objectNode);
  return (code: string, env: Environment) => interpreter.evaluate(code, env);
}