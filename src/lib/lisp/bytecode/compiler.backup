import { OpCode, Instruction, BytecodeFunction, Pattern } from "./opcodes";
import type {
  Expression,
  Symbol,
  Atom,
  List,
  ObjectLiteral,
  FunctionDefinition,
  AST,
  LocatedExpression,
  Environment,
} from "../types";
import { isSymbol } from "../types";

/**
 * Compiler class for converting Lisp AST to bytecode
 */
export class Compiler {
  private constants: any[] = [];
  private symbolNames: string[] = [];
  private instructions: Instruction[] = [];
  private patterns: Pattern[] = [];
  private patternFunctions: Set<string> = new Set();
  private currentPatternObj: any = null;

  // Find or add a constant value to the constant pool
  private addConstant(value: any): number {
    // Check if the constant already exists
    const existingIndex = this.constants.findIndex(
      (c) =>
        c === value ||
        (typeof c === "object" &&
          c !== null &&
          typeof value === "object" &&
          value !== null &&
          JSON.stringify(c) === JSON.stringify(value)),
    );

    if (existingIndex !== -1) {
      return existingIndex;
    }

    // Add the new constant
    this.constants.push(value);
    return this.constants.length - 1;
  }

  // Find or add a symbol name to the symbol pool
  private addSymbol(name: string): number {
    const existingIndex = this.symbolNames.indexOf(name);
    if (existingIndex !== -1) {
      return existingIndex;
    }

    this.symbolNames.push(name);
    return this.symbolNames.length - 1;
  }

  // Add an instruction
  private emit(opcode: OpCode, operand?: any, offset?: number, line?: number): number {
    const index = this.instructions.length;
    this.instructions.push({
      opcode,
      operand,
      offset,
      line,
    });
    return index;
  }

  // Patch a jump instruction with the correct offset
  private patchJump(jumpIndex: number): void {
    const jump = this.instructions[jumpIndex];
    const offset = this.instructions.length;

    jump.offset = offset;
  }

  // Compile a list expression
  private compileList(list: LocatedExpression[]): void {
    if (list.length === 0) {
      // Empty list, just push an empty array
      const constIndex = this.addConstant([]);
      this.emit(OpCode.PUSH_CONSTANT, constIndex);
      return;
    }

    const firstItem = list[0];
    if (isSymbol(firstItem)) {
      const symbol = (firstItem.expression as Symbol).value;

      // Handle special forms first
      switch (symbol) {
        case "def":
          return this.compileDef(list);
        case "defun":
          return this.compileDefun(list);
        case "if":
          return this.compileIf(list);
        case "let":
          return this.compileLet(list);
        case "set":
          return this.compileSet(list);
        case "lambda":
          return this.compileLambda(list);
        case "quote":
          return this.compileQuote(list[1]);
        case "+":
          return this.compileArithmeticOp(list, OpCode.ADD);
        case "-":
          return this.compileArithmeticOp(list, OpCode.SUB);
        case "*":
          return this.compileArithmeticOp(list, OpCode.MUL);
        case "/":
          return this.compileArithmeticOp(list, OpCode.DIV);
        case ">":
          return this.compileArithmeticOp(list, OpCode.GT);
        case "<":
          return this.compileArithmeticOp(list, OpCode.LT);
        case "<=":
          return this.compileArithmeticOp(list, OpCode.LTE);
        case ">=":
          return this.compileArithmeticOp(list, OpCode.GTE);
        case "==":
          return this.compileArithmeticOp(list, OpCode.EQ);
        case "get":
          return this.compileGetProp(list);
      }

      // For function calls where the function name is a symbol
      // Just push the function name as a string
      const constIndex = this.addConstant(symbol);
      this.emit(OpCode.PUSH_CONSTANT, constIndex);

      // Then compile each argument
      for (let i = 1; i < list.length; i++) {
        this.compileExpression(list[i]);
      }

      // Check if this is a pattern function (defined with 'def')
      const argCount = list.length - 1;
      if (this.patternFunctions.has(symbol)) {
        // Use pattern matching call for functions defined with 'def'
        this.emit(OpCode.CALL_PATTERN, argCount);
      } else {
        // Regular function call
        this.emit(OpCode.CALL, argCount);
      }
      return;
    }

    // Regular function call where the function is an expression
    // First compile the function
    this.compileExpression(list[0]);

    // Then compile each argument
    for (let i = 1; i < list.length; i++) {
      this.compileExpression(list[i]);
    }

    // Call the function with (list.length - 1) arguments
    const argCount = list.length - 1;
    this.emit(OpCode.CALL, argCount);
  }

  // Compile def (pattern-based function)
  private compileDef(list: LocatedExpression[]): void {
    if (list.length < 4) {
      throw new Error("def requires a name, pattern, and body");
    }

    const fnName = (list[1].expression as Symbol).value;
    const pattern = list[2]; // This is the pattern object or expression
    const body = list[3];

    // Register this as a pattern function
    this.patternFunctions.add(fnName);
    
    // Check if pattern has a literal number value
    if (pattern.expression && 
        Array.isArray(pattern.expression) && 
        pattern.expression.length > 0 && 
        pattern.expression[0].expression && 
        typeof pattern.expression[0].expression === 'number') {
      // It's a specific pattern like (1) - store the number for direct matching
      const numberValue = pattern.expression[0].expression;
      console.log(`Pattern with direct number value: ${numberValue}`);
      
      // Modify the pattern object to include this number value
      const patternObj: any = {
        params: [pattern.expression],
        body: 0,
        predicates: [],
        directMatch: numberValue
      };
      
      // Save this patternObj for the compilation step
      this.currentPatternObj = patternObj;
    }

    // First, create a function that takes the pattern arguments
    
    // Extract parameter names from the pattern
    let paramNames: string[] = [];
    
    if (pattern.expression && 
        Array.isArray(pattern.expression) && 
        pattern.expression.length > 0 && 
        pattern.expression[0].expression && 
        typeof pattern.expression[0].expression === "object" && 
        (pattern.expression[0].expression as any).type === "Symbol") {
      // For simple patterns like (x), extract the parameter name
      paramNames = [(pattern.expression[0].expression as any).value];
    }
    
    // Temporarily save the current compilation context
    const savedInstructions = this.instructions;
    const savedConstants = this.constants; 
    const savedSymbols = this.symbolNames;
    const savedPatterns = this.patterns;
    
    // Start a fresh compilation for this function
    this.instructions = [];
    this.constants = [];
    this.symbolNames = [];
    this.patterns = [];
    
    // Compile the function body
    this.compileExpression(body);
    this.emit(OpCode.RETURN);
    
    // Create the bytecode for this pattern's function
    const patternFunction: BytecodeFunction = {
      instructions: this.instructions,
      constants: this.constants,
      symbolNames: this.symbolNames,
      arity: paramNames.length || 1,
      variadic: false,
      patterns: this.patterns,
      paramNames: paramNames.length > 0 ? paramNames : ["obj"],
    };
    
    // Store this bytecode in the currentPatternObj
    if (this.currentPatternObj) {
      this.currentPatternObj.functionImpl = patternFunction;
    }
    
    // Restore the original compilation context
    this.instructions = savedInstructions;
    this.constants = savedConstants;
    this.symbolNames = savedSymbols;
    this.patterns = savedPatterns;
    
    // We'll still create a generic function just so lookups work
    const funcDef: FunctionDefinition = {
      type: "function",
      params: [
        {
          expression: { type: "Symbol", value: "obj" },
          location: pattern.location,
        },
      ], // Single parameter 'obj' that will be destructured
      body: body,
    };

    // Compile the function and store it in the environment
    this.compileFunction(funcDef, fnName);

    // Check if it's an object pattern
    if (
      pattern.expression &&
      typeof pattern.expression === "object" &&
      (pattern.expression as any).type === "object"
    ) {
      // It's an object pattern
      const objPattern = pattern.expression as ObjectLiteral;

      // Create a simplified pattern object for the VM
      const patternObj: any = {
        params: [
          {
            type: "object",
            properties: {},
          },
        ],
        body: 0, // Will be set by the VM at runtime
        predicates: [],
      };

      // Add properties to the pattern
      for (const [key, value] of Object.entries(objPattern.properties)) {
        patternObj.params[0].properties[key] = value.expression;
      }

      // Check if patterns already exist
      this.emit(OpCode.LOAD, `${fnName}_patterns`);
      this.emit(OpCode.DUPLICATE);
      
      // Jump if patterns array already exists
      const jumpIfPatterns = this.emit(OpCode.JUMP_IF_TRUE, null);
      
      // If we're here, no patterns array exists yet, so create one
      this.emit(OpCode.POP); // Remove null/undefined value
      
      // Create new patterns array with just this pattern
      const patternConst = this.addConstant(patternObj);
      this.emit(OpCode.PUSH_CONSTANT, patternConst);
      const patternsArray = this.addConstant([patternObj]);
      this.emit(OpCode.PUSH_CONSTANT, patternsArray);
      this.emit(OpCode.STORE, `${fnName}_patterns`);
      
      // Jump past the pattern append code
      const skipAppend = this.emit(OpCode.JUMP, null);
      
      // Handle appending to existing patterns
      this.patchJump(jumpIfPatterns);
      
      // At this point we have the existing patterns array on the stack
      const newPatternConst = this.addConstant(patternObj);
      this.emit(OpCode.PUSH_CONSTANT, newPatternConst);
      this.emit(OpCode.APPEND_PATTERN);
      this.emit(OpCode.STORE, `${fnName}_patterns`);
      
      this.patchJump(skipAppend);
    } else {
      // For non-object patterns, create a pattern with function implementation
      this.currentPatternObj = {
        params: [pattern.expression],
        body: 0,
        predicates: [],
      };
      
      // The function implementation will be added before the pattern is stored

      // Check if patterns already exist
      this.emit(OpCode.LOAD, `${fnName}_patterns`);
      this.emit(OpCode.DUPLICATE);
      
      // Jump if patterns array already exists
      const jumpIfPatterns = this.emit(OpCode.JUMP_IF_TRUE, null);
      
      // If we're here, no patterns array exists yet, so create one
      this.emit(OpCode.POP); // Remove null/undefined value
      
      // Create new patterns array with just this pattern
      console.log("creating new simple patterns array=", this.currentPatternObj);
      const patternsArray = this.addConstant([this.currentPatternObj]);
      this.emit(OpCode.PUSH_CONSTANT, patternsArray);
      this.emit(OpCode.STORE, `${fnName}_patterns`);
      
      // Jump past the pattern append code
      const skipAppend = this.emit(OpCode.JUMP, null);
      
      // Handle appending to existing patterns
      this.patchJump(jumpIfPatterns);
      
      // At this point we have the existing patterns array on the stack
      console.log("appending to simple patterns array=", this.currentPatternObj);
      const newPatternConst = this.addConstant(this.currentPatternObj);
      this.emit(OpCode.PUSH_CONSTANT, newPatternConst);
      this.emit(OpCode.APPEND_PATTERN);
      this.emit(OpCode.STORE, `${fnName}_patterns`);
      
      this.patchJump(skipAppend);
    }
  }

  private compileGetProp(list: LocatedExpression[]): void {
    this.compileExpression(list[1]);
    this.compileExpression(list[2]);
    this.emit(OpCode.GET_PROP);
  }

  // Compile defun (simple function definition)
  private compileDefun(list: LocatedExpression[]): void {
    if (list.length !== 4) {
      throw new Error("defun requires a name, parameter list, and body");
    }

    const fnName = (list[1].expression as Symbol).value;
    const params = list[2].expression as LocatedExpression[];
    const body = list[3];

    // Create a function with the parameters and body
    const funcDef: FunctionDefinition = {
      type: "function",
      params: params, // Just the actual parameters, without the function name
      body,
    };

    // Compile the function definition
    this.compileFunction(funcDef, fnName);
  }

  // Compile a function definition
  private compileFunction(funcDef: FunctionDefinition, name?: string): void {
    const { params, body } = funcDef;

    // Save current instructions and start a new function
    const savedInstructions = this.instructions;
    const savedConstants = this.constants;
    const savedSymbols = this.symbolNames;
    const savedPatterns = this.patterns;

    this.instructions = [];
    this.constants = [];
    this.symbolNames = [];
    this.patterns = [];

    // Extract parameter names for binding
    const paramNames = params.map((p) => {
      if (isSymbol(p)) {
        return (p.expression as Symbol).value;
      } else {
        throw new Error("Function parameters must be symbols");
      }
    });

    // Compile function body
    this.compileExpression(body);
    this.emit(OpCode.RETURN);

    // Create the function bytecode
    const functionCode: BytecodeFunction = {
      instructions: this.instructions,
      constants: this.constants,
      symbolNames: this.symbolNames,
      arity: paramNames.length, // Number of parameters this function takes
      variadic: false,
      patterns: this.patterns,
      paramNames: paramNames, // Store parameter names for binding
    };

    // Restore original context
    this.instructions = savedInstructions;
    this.constants = savedConstants;
    this.symbolNames = savedSymbols;
    this.patterns = savedPatterns;

    // Add function to constants and push it on the stack
    const constIndex = this.addConstant(functionCode);
    this.emit(OpCode.PUSH_CONSTANT, constIndex);

    if (name) {
      // Store function in environment
      this.emit(OpCode.STORE, `${name}_fn`);
      // Push null as the result of function definition
      //this.emit(OpCode.PUSH_CONSTANT, this.addConstant(null));
    }
  }

  // Compile if expression
  private compileIf(list: LocatedExpression[]): void {
    if (list.length !== 4) {
      throw new Error("if statement requires condition, then, and else expressions");
    }

    // Compile condition
    this.compileExpression(list[1]);

    // Emit jump-if-false instruction (we'll patch the offset later)
    const jumpIfFalseIndex = this.emit(OpCode.JUMP_IF_FALSE, null);

    // Compile 'then' branch
    this.compileExpression(list[2]);

    // Emit jump instruction to skip the 'else' branch (we'll patch the offset later)
    const jumpIndex = this.emit(OpCode.JUMP, null);

    // Patch the jump-if-false to jump to the 'else' branch
    this.patchJump(jumpIfFalseIndex);

    // Compile 'else' branch
    this.compileExpression(list[3]);

    // Patch the unconditional jump to skip the 'else' branch
    this.patchJump(jumpIndex);
  }

  // Compile let expression
  private compileLet(list: LocatedExpression[]): void {
    if (list.length < 3) {
      throw new Error("let requires bindings and at least one body expression");
    }

    const bindings = list[1].expression as LocatedExpression[];
    const body = list.slice(2);

    // Compile each binding
    for (const binding of bindings) {
      if (!Array.isArray(binding.expression) || binding.expression.length !== 2) {
        throw new Error("let bindings must be pairs of [name value]");
      }

      const [varName, varValue] = binding.expression;
      if (!isSymbol(varName)) {
        throw new Error("variable name in let binding must be a symbol");
      }

      // Compile the value expression
      this.compileExpression(varValue);

      // Store it in the environment
      this.emit(OpCode.STORE, (varName.expression as Symbol).value);
    }

    // Compile body expressions
    for (let i = 0; i < body.length; i++) {
      this.compileExpression(body[i]);

      // Pop result of all but the last expression
      if (i < body.length - 1) {
        this.emit(OpCode.POP);
      }
    }
  }

  // Compile set expression
  private compileSet(list: LocatedExpression[]): void {
    if (list.length !== 3) {
      throw new Error("set requires a variable name and a value");
    }

    const varName = list[1];
    const value = list[2];

    if (!isSymbol(varName)) {
      throw new Error("set requires a symbol as first argument");
    }

    // Compile the value expression
    this.compileExpression(value);

    // Store the value in the variable
    this.emit(OpCode.STORE, (varName.expression as Symbol).value);
  }

  // Compile lambda expression
  private compileLambda(list: LocatedExpression[]): void {
    if (list.length !== 3) {
      throw new Error("lambda requires parameter list and body");
    }

    const params = list[1].expression as LocatedExpression[];
    const body = list[2];

    // Create a function definition
    const funcDef: FunctionDefinition = {
      type: "function",
      params: params,
      body: body,
    };

    // Compile the function
    this.compileFunction(funcDef);
  }

  private compileArithmeticOp(list: LocatedExpression[], opcode: OpCode): void {
    for (let i = list.length; i >= 1; i--) {
      this.compileExpression(list[i]);
    }
    this.emit(opcode, list.length - 1);
  }

  // Compile quoted expression
  private compileQuote(expr: LocatedExpression): void {
    // For now, just add the quoted expression as a constant
    const constIndex = this.addConstant(expr.expression);
    this.emit(OpCode.PUSH_CONSTANT, constIndex);
  }

  // Compile object literal
  private compileObject(obj: ObjectLiteral): void {
    const { spread, properties } = obj;
    let propertyCount = Object.keys(properties).length;

    // If there's a spread object, evaluate it first
    if (spread) {
      this.compileExpression(spread);
      this.emit(OpCode.SPREAD);
      // SPREAD will push key-value pairs onto the stack
    }

    // Compile each property
    for (const [key, value] of Object.entries(properties)) {
      // Push key and value onto the stack
      const keyConstIndex = this.addConstant(key);
      this.emit(OpCode.PUSH_CONSTANT, keyConstIndex);
      this.compileExpression(value);
    }

    const propCountIndex = this.addConstant(propertyCount);
    this.emit(OpCode.PUSH_CONSTANT, propCountIndex);
    // Create object from the properties on the stack
    this.emit(OpCode.MAKE_OBJECT, spread ? 1 : 0);
  }

  // Compile atom (number, string, boolean, null, or symbol)
  private compileAtom(atom: Atom): void {
    if (isSymbol(atom)) {
      const symbolValue = (atom as Symbol).value;

      // Check if it's a function reference
      if (symbolValue.endsWith("_fn")) {
        const funcName = symbolValue.slice(0, -3); // Remove _fn suffix
        this.emit(OpCode.LOAD_FN, funcName);
      } else {
        // Regular variable lookup
        this.emit(OpCode.LOAD, symbolValue);
      }
    } else {
      // Literal value (number, string, boolean, null)
      const constIndex = this.addConstant(atom);
      this.emit(OpCode.PUSH_CONSTANT, constIndex);
    }
  }

  // Compile any expression
  private compileExpression(expr: LocatedExpression): void {
    // Safety check for undefined or null expressions
    if (!expr || expr.expression === undefined) {
      // Push null constant for undefined expressions
      //const nullConstIndex = this.addConstant(null);
      //this.emit(OpCode.PUSH_CONSTANT, nullConstIndex);
      return;
    }

    const expression = expr.expression;

    if (Array.isArray(expression)) {
      this.compileList(expression as List);
    } else if (typeof expression === "object" && expression !== null) {
      if ((expression as any).type === "object") {
        this.compileObject(expression as ObjectLiteral);
      } else if ((expression as any).type === "function") {
        this.compileFunction(expression as FunctionDefinition);
      } else if ((expression as any).type === "Symbol") {
        this.compileAtom(expression as Symbol);
      } else {
        // Unknown object type - add better error handling
        console.warn(`Unknown expression type, treating as null:`, expression);
        const nullConstIndex = this.addConstant(null);
        this.emit(OpCode.PUSH_CONSTANT, nullConstIndex);
      }
    } else {
      this.compileAtom(expression as Atom);
    }
  }

  // Compile a full program
  compile(ast: AST): BytecodeFunction {
    this.constants = [];
    this.symbolNames = [];
    this.instructions = [];
    this.patterns = [];
    this.patternFunctions = new Set(); // Reset pattern functions for each compile
    this.currentPatternObj = null; // Reset current pattern

    // Compile each expression in the program
    for (let i = 0; i < ast.length; i++) {
      this.compileExpression(ast[i]);

      // Pop result of all but the last expression
      if (i < ast.length - 1) {
        this.emit(OpCode.POP);
      }
    }

    // Return the compiled program
    return {
      instructions: this.instructions,
      constants: this.constants,
      symbolNames: this.symbolNames,
      arity: 0,
      variadic: false,
      patterns: this.patterns,
    };
  }
}
