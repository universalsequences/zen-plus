export const replaceAll = (target: string, search: string, repl: string): string => {
    return target.split(search).join(repl);
};
