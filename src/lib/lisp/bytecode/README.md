# Bytecode Lisp Interpreter

This directory contains a bytecode-based implementation of the Lisp interpreter to replace the
tree-walking interpreter in `src/lib/lisp/eval.ts`.

## Overview

The bytecode interpreter includes:

1. `opcodes.ts` - Defines VM opcodes and bytecode data structures
2. `compiler.ts` - Compiles Lisp AST to bytecode
3. `vm.ts` - Virtual machine that executes the bytecode
4. `index.ts` - Interface to the bytecode interpreter that matches the original API

## Benefits of Bytecode Approach

- **Performance**: Much faster than tree-walking because:
  - Expressions are parsed once, then compiled to bytecode
  - Bytecode execution avoids repetitive tree traversal
  - Function lookup and pattern matching are optimized
  - Memory usage is reduced through code sharing

- **Efficiency**:
  - Constant/symbol pooling avoids duplicated data
  - Direct bytecode execution is CPU-efficient
  - Fewer allocations during execution
  - Stack-based execution model is cache-friendly

## Implementation Status

The current implementation is a proof of concept. Key tasks to complete:

1. **Fix Operator Implementations**:
   - Most operators need robust implementations that handle edge cases
   - Pattern matching needs thorough testing
   - List operations need complete implementation

2. **Environment Handling**:
   - Fix closures and environment scoping
   - Ensure proper variable lookup in nested scopes

3. **Function Calling**:
   - Fix function compilation and application
   - Improve pattern matching dispatch
   - Support native function interop

4. **Complete Tests**:
   - Get unit tests working with initial examples
   - Add comprehensive test coverage
   - Add benchmarks comparing tree-walking vs bytecode

## Development Path

1. **Get Basic Arithmetic Working**: Fix +, -, *, / operators
2. **Add Control Flow**: Fix if, switch, conditions
3. **Add Function Support**: Fix defun, lambda, def
4. **Add Object and List Operations**: Fix list, car, cdr, object literal support
5. **Optimize Performance**: Add profiling and performance tuning

## Using the Interpreter

The bytecode interpreter implements the same interface as the original tree-walking interpreter,
making it a drop-in replacement:

```typescript
import { createContext } from '../lib/lisp/bytecode';

// Create a context with a pool and object node
const evaluate = createContext(pool, objectNode);

// Evaluate Lisp code with an environment
const result = evaluate(parse(lispCode), environment);
```

## Performance Targets

- GOAL: **At least 5-10x faster** than the tree-walking interpreter
- Expectation: Better performance on:
  - Recursive function calls
  - Complex pattern matching
  - Large list operations
  - Highly nested expressions

---

## Future Enhancements

- JIT compilation for hot functions
- Further memory optimizations
- Better debugging support with source maps
- Add tail call optimization
- Add more specialized instructions for common operations