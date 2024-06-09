import { Context } from "./context";
import { CodeBlock } from "./simd";
import { Generated } from "./zen";


export const emitCode = (context: Context, code: string, variable: string, ...gens: Generated[]): CodeFragment[] => {
    return emitCodeHelper(true, context, code, variable, ...gens);
}

export interface CodeFragment {
    contexts?: Context[];
    id?: number;
    code: string;
    variable: string;
    dependencies: CodeFragment[];
    context: Context;
    histories: string[];
    output?: number;
    clearMemoization?: () => void;
};

export const getAllVariables = (context: Context | null, fragment: CodeFragment, visited: Set<CodeFragment> = new Set<CodeFragment>()): string[] => {
    if (visited.has(fragment)) {
        return [];
    }
    visited.add(fragment);

    let depVariables = fragment.dependencies.flatMap(
        dep => getAllVariables(context, dep, visited));
    if (context === null && fragment.code.includes("block_")) {
        let lines = fragment.code.split("\n");
        let vars: string[] = [];
        for (let line of lines) {
            if (line.includes("block_")) {
                let tokens = line.trim().split(" ").map(x => x.trim());
                vars.push(tokens[1]);
            }
        }

        return [...vars, ...depVariables];

    }
    if (context === null || fragment.context === context) {
        return [fragment.variable, ...depVariables]
    }
    return depVariables;
};

export const isVariableEmitted = (variable: string, fragments: CodeFragment[], visited: Set<CodeFragment> = new Set<CodeFragment>()): boolean => {
    return fragments.some(
        x => _isVariableEmitted(variable, x, visited));
};

const _isVariableEmitted = (variable: string, fragment: CodeFragment, visited: Set<CodeFragment> = new Set<CodeFragment>()): boolean => {
    if (visited.has(fragment)) {
        return false;
    }
    visited.add(fragment);
    if (fragment.variable === variable) {
        return true;
    }

    return fragment.dependencies.some(
        x => x.variable === variable ||
            isVariableEmitted(variable, x.dependencies, visited));
};

export const emitCodeHelper = (isSIMD: boolean, context: Context, code: string, variable: string, ...gens: Generated[]): CodeFragment[] => {
    if (context.isVariableEmitted(variable)) {
        return [];
    }

    let dependencies: CodeFragment[] = [];
    for (let gen of gens) {
        if (gen.codeFragments) {
            dependencies.push(...([...gen.codeFragments].reverse()));
        }
    }
    let codeFragment: CodeFragment = {
        code,
        variable,
        context,
        histories: Array.from(new Set(dependencies.flatMap(x => x.histories))),
        dependencies: dependencies
    };

    return [codeFragment];
}

export const printCodeFragments = (context: Context, codeFragments: CodeFragment[]): string => {
    let alreadyPrinted = new Set<string>();
    return printFragment(context, codeFragments[codeFragments.length - 1], alreadyPrinted);
};

const printFragment = (context: Context, codeFragment: CodeFragment, alreadyPrinted: Set<string>): string => {
    if (!codeFragment) {
        return "";
    }
    if (codeFragment.context !== context) {
        if (alreadyPrinted.has(codeFragment.variable) || codeFragment.variable.includes('history')) {
            return "";
        }
        alreadyPrinted.add(codeFragment.variable);
        return `float ${codeFragment.variable} = block_${codeFragment.variable}[j]; // cross-block
`;
    }
    let out = alreadyPrinted.has(codeFragment.variable) ? "" : codeFragment.code;
    alreadyPrinted.add(codeFragment.variable);
    let pre = "";

    for (let dep of codeFragment.dependencies) {
        pre = pre + printFragment(context, dep, alreadyPrinted);
    }
    return pre + out;
};


