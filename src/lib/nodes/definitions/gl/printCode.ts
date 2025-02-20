import { Arg, UGen, stringToTypeString } from "@/lib/gl/types";
import { lookupDoc } from "./doc";
import { ObjectNode } from "@/lib/nodes/types";
import type {
  CompoundOperator,
  CustomParams,
  Operator,
  Statement,
} from "@/lib/nodes/definitions/zen/types";

export const printCode = (statement: Statement): string => {
  if (statement === undefined) {
    return "";
  }
  const variables: Variables = {};
  const uniforms: Uniforms = {};
  const body = _printStatement(statement, variables, uniforms, 0);
  const _variables = Object.values(variables).sort((a, b) => a.idx - b.idx);
  let varOut = "";
  for (const variable of _variables) {
    varOut += `let ${variable.name} = ${variable.printed};
`;
  }

  let uniformsString = "{";
  for (const name in uniforms) {
    uniformsString += `"${name}": ${uniforms[name]},
`;
  }
  uniformsString += "}";
  return `${varOut} return {code:  ${body} , uniforms: ${uniformsString}}`;
};

type Uniforms = {
  [uniUserName: string]: string; // uni var name
};

type Variables = {
  [id: string]: Variable;
};

interface Variable {
  idx: number;
  name: string;
  printed: string;
}

export const getVariableName = (op: string, idx: number, zobject_id: string): string => {
  return `${op.trim()[0]}${idx} `;
};

export const _printStatement = (
  statement: Statement,
  variables: Variables,
  uniforms: Uniforms,
  deep = 0,
): string => {
  if (typeof statement === "number") {
    return (statement as number).toString();
  }
  if (typeof statement === "string") {
    return '"' + (statement as string) + '"';
  }

  if (!Array.isArray(statement)) {
    return "";
  }
  const [operator, ...statements] = statement;
  let op: string = (operator as CompoundOperator).name || (operator as string);

  const def = lookupDoc(op);
  if (def?.fnString) {
    op = def.fnString;
  }
  op = op.trim();

  const zobject = statement.node as ObjectNode;
  if (zobject && variables[zobject.id] !== undefined) {
    return variables[zobject.id].name;
  }

  let opArgs = "";
  const _name = (operator as CompoundOperator).name;
  const firstArg = "";
  const created = false;

  const finalArgs: string = "";

  if (_name === "variable") {
    return `variable("${(operator as CompoundOperator).variableName as string}")`;
    //opArgs = `"${(operator as CompoundOperator).variableName as string}"`;
  }

  op = `gl.${op}`;
  let exactArgs: string | undefined;
  if ((operator as CompoundOperator).value !== undefined) {
    opArgs = (operator as CompoundOperator).value?.toString() as string;
    if (zobject && "presetManager" in zobject) {
      if ((zobject as any).presetManager.presets.some((x: any) => x[(zobject as any).id])) {
        // its contained in a preset so place the variable name as the output
        opArgs = getVariableName("p", 0, zobject.id);
      }
    }
  }

  let output = "";
  let uniformName = "";

  if (exactArgs) {
    output = `${op} (${exactArgs})`;
  } else if ((op as string) === "defun") {
    output = `gl.defun(${_printStatement(
      statements[0] as Statement,
      variables,
      uniforms,
      deep + 1,
    )}, ${_printStatement(statements[1] as Statement, variables, uniforms, deep + 1)})`;
  } else if (_name === "argument") {
    const compoundOperator = operator as CompoundOperator;
    output = `gl.argument(${_printStatement(statements[0] as Statement, variables, uniforms, deep + 1)}, ${compoundOperator.value as number}, gl.${stringToTypeString(statements[1] as string)})`;
  } else if (_name === "uniform") {
    if (zobject.attributes.type === "Sampler2D") {
      if (zobject.attributes.feedback) {
        output = "gl.uniform(gl.GLType.Sampler2D, [0], 1,1,true)";
      } else {
        // not feedback so lets pass the
        const width = zobject.arguments[1] as number;
        const height = zobject.arguments[2] as number;
        output = `gl.uniform(gl.GLType.Sampler2D, new Array(${width}*${height}*4).fill(0), ${width}, ${height})`;
      }
    } else {
      output = `gl.uniform(gl.GLType.Float, ${zobject.storedMessage || 0})`;
    }
    uniformName = zobject.arguments[0] as string; // store the name so we may emit it
  } else if (statements.length === 0) {
    output = `${op}(${opArgs})`;
  } else {
    output = `${op}(${firstArg ? `${firstArg},` : ""}${statements
      .filter((x) => x !== undefined)
      .map((x) => _printStatement(x as Statement, variables, uniforms, deep + 1))
      .join(`,${printDeep(deep)}`)}${finalArgs})`;
  }

  if (zobject) {
    if (!variables[zobject.id]) {
      const idx = Object.keys(variables).length;
      op = op.replaceAll("(", "");
      op = op.replaceAll(".", "");
      op = op.replaceAll(")", "");
      op = op.replaceAll('"', "");
      op = op.replace("gl", "");

      const name = getVariableName(op, idx, zobject.id); //`${ op }${ idx } `;

      variables[op === "uniform" ? `${zobject.id}_pre` : zobject.id] = {
        idx,
        name,
        printed: output,
      };

      if (op === "uniform") {
        uniforms[uniformName] = name;

        const idx2 = Object.keys(variables).length;
        const name2 = getVariableName(op, idx2, zobject.id);
        output = `${name}()`;
        variables[zobject.id] = {
          idx: idx2,
          name: name2,
          printed: output,
        };
      }
    }
    if (variables[zobject.id] !== undefined) {
      output = variables[zobject.id].name;
    }
  }

  return output;
};

const printDeep = (deep: number) => {
  return "";
};
