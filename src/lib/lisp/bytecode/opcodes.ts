// Opcodes for the Lisp bytecode VM
export enum OpCode {
  // Stack operations
  PUSH_CONSTANT = 0, // Push a constant value onto the stack
  PUSH_SYMBOL = 1, // Push a symbol reference onto the stack
  PUSH_LIST = 2, // Create a list and push it onto the stack
  PUSH_OBJECT = 3, // Create an object and push it onto the stack
  POP = 4, // Pop a value from the stack

  // Environment operations
  LOAD = 5, // Load a value from the environment
  STORE = 6, // Store a value in the environment
  LOAD_FN = 7, // Load a function from the environment

  // List/Object operations
  MAKE_LIST = 8, // Create a list from n items on the stack
  MAKE_OBJECT = 9, // Create an object from n key-value pairs on the stack
  GET_PROP = 10, // Get a property from an object
  GET_INDEX = 11, // Get an item at an index from a list
  SPREAD = 12, // Spread an object or array into the stack

  // Function operations
  CALL = 13, // Call a function with n arguments
  CALL_PATTERN = 14, // Call a function with pattern matching
  RETURN = 15, // Return from a function

  // Control flow
  JUMP = 16, // Jump to an address
  JUMP_IF_FALSE = 17, // Jump if the top of the stack is false
  JUMP_IF_TRUE = 18, // Jump if the top of the stack is true

  // Other operations
  EVALUATE = 19, // Evaluate an expression
  MATCH_PATTERN = 20, // Match a pattern
  BIND_PATTERN = 21, // Bind pattern matches to variables

  ADD = 22,
  SUB = 23,
  MUL = 24,
  DIV = 25,
  LT = 26,
  LTE = 27,
  GT = 28,
  GTE = 29,
  EQ = 30,
  DUPLICATE = 31, // Duplicate the top value of the stack
  APPEND_PATTERN = 32, // Append a pattern to a patterns array
}

// Type for a compiled bytecode instruction
export type Instruction = {
  opcode: OpCode;
  operand?: any; // Optional operand value (constant, symbol name, etc.)
  line?: number; // Source code line number (for debugging)
  offset?: number; // Offset for jump instructions
};

// Type for a compiled bytecode function
export type BytecodeFunction = {
  instructions: Instruction[];
  constants: any[]; // Constant pool
  symbolNames: string[]; // Symbol name pool
  arity: number; // Number of arguments
  variadic: boolean; // Whether it accepts variable number of arguments
  patterns: Pattern[]; // Patterns for pattern matching
  paramNames?: string[]; // Names of parameters for binding
};

// Type for a pattern
export interface Pattern {
  params: any[]; // The pattern to match against
  body: number; // Index of the first instruction of the body
  predicates?: ((arg: any) => boolean)[]; // Optional runtime checks
}

// Runtime representation of a compiled bytecode function
export type VMFunction = {
  code: BytecodeFunction;
  closure?: Map<string, any>; // Closed over variables
  name?: string; // Function name
};
