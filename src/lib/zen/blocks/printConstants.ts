import {Context} from '../context';

export const printConstantInitializer = (context: Context): string => {
    let arrays = "";
    let body = "";
    for (let variable in context.constantArrays) {
        arrays += `float ${variable}[128] __attribute__((aligned(16)));
`;
        body += `    for (int i=0; i < 128; i++) {
        ${variable}[i] = ${context.constantArrays[variable]};
    }
`
    }

    let code = `
${arrays}
void initializeConstants() {
${body}
}
`;
    return code;
}