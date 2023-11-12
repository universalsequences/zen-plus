
export interface Definition {
    description: string;
    numberOfInlets: number;
    numberOfOutlets: number;
    inletNames?: string[];
    outletNames?: string[];
    defaultValue?: number;
}

type API = {
    [x: string]: Definition;
};

export const documenter = () => {
    let api: API = {};
    let doc = (name: string, definition: Definition) => {
        if (definition.numberOfOutlets === undefined) {
            definition.numberOfOutlets = 1;
        }
        api[name] = definition;
    };

    let lookupDoc = (name: string): Definition | null => {
        return api[name] || null;
    };

    return { lookupDoc, doc };
};


