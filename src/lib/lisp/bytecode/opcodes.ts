// Opcodes for the Lisp bytecode VM
export enum OpCode {
  // Stack operations
  PUSH_CONSTANT, // Push a constant value onto the stack
  PUSH_SYMBOL,   // Push a symbol reference onto the stack
  PUSH_LIST,     // Create a list and push it onto the stack
  PUSH_OBJECT,   // Create an object and push it onto the stack
  POP,           // Pop a value from the stack

  // Environment operations
  LOAD,          // Load a value from the environment
  STORE,         // Store a value in the environment
  LOAD_FN,       // Load a function from the environment

  // List/Object operations
  MAKE_LIST,     // Create a list from n items on the stack
  MAKE_OBJECT,   // Create an object from n key-value pairs on the stack
  GET_PROP,      // Get a property from an object
  GET_INDEX,     // Get an item at an index from a list
  SPREAD,        // Spread an object or array into the stack

  // Function operations
  CALL,          // Call a function with n arguments
  CALL_PATTERN,  // Call a function with pattern matching
  RETURN,        // Return from a function
  
  // Control flow
  JUMP,          // Jump to an address
  JUMP_IF_FALSE, // Jump if the top of the stack is false
  JUMP_IF_TRUE,  // Jump if the top of the stack is true

  // Other operations
  EVALUATE,      // Evaluate an expression
  MATCH_PATTERN, // Match a pattern
  BIND_PATTERN,  // Bind pattern matches to variables
}

// Type for a compiled bytecode instruction
export type Instruction = {
  opcode: OpCode;
  operand?: any;      // Optional operand value (constant, symbol name, etc.)
  line?: number;      // Source code line number (for debugging)
  offset?: number;    // Offset for jump instructions
};

// Type for a compiled bytecode function
export type BytecodeFunction = {
  instructions: Instruction[];
  constants: any[];   // Constant pool
  symbolNames: string[]; // Symbol name pool
  arity: number;      // Number of arguments
  variadic: boolean;  // Whether it accepts variable number of arguments
  patterns: Pattern[]; // Patterns for pattern matching
  paramNames?: string[]; // Names of parameters for binding
};

// Type for a pattern
export interface Pattern {
  params: any[];     // The pattern to match against
  body: number;      // Index of the first instruction of the body
  predicates?: ((arg: any) => boolean)[]; // Optional runtime checks
}

// Runtime representation of a compiled bytecode function
export type VMFunction = {
  code: BytecodeFunction;
  closure?: Map<string, any>; // Closed over variables
  name?: string;     // Function name
};