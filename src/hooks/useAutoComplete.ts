import React, { useEffect, useState } from 'react';
import { useStorage } from '@/contexts/StorageContext';
import { API, Definition } from '@/lib/docs/docs';
import { OperatorContextType, OperatorContext, getAllContexts } from '@/lib/nodes/context';
import { NodeFunction, ObjectNode } from '@/lib/nodes/types';

export interface ContextDefinition {
    definition: Definition & { id?: string };
    context?: OperatorContext;
}

const _sortContexts = (contexts: OperatorContext[], type: OperatorContextType, filter?: boolean): OperatorContext[] => {
    // stay within the operator context
    let contextA = contexts.filter(x => x.type === type);
    if (filter) {
        return contextA;
    }
    let contextB = contexts.filter(x => x.type !== type);
    return [...contextA, ...contextB];
}

let dist = (a: ObjectNode, b: ObjectNode): number => {
    return Math.sqrt(Math.pow(a.position.x - b.position.x, 2) + Math.pow(a.position.y - b.position.y, 2));
};

const sortContexts = (contexts: OperatorContext[], node: ObjectNode): OperatorContext[] => {
    if (node.text && node.operatorContextType && node.operatorContextType !== OperatorContextType.NUMBER) {
        return _sortContexts(contexts, node.operatorContextType, true);
    }

    let nodes = node.patch.objectNodes.filter(x => x.operatorContextType !== OperatorContextType.NUMBER).filter(
        x => x !== node).sort(
            (a, b) => dist(a, node) - dist(b, node));

    if (nodes[0]) {
        return _sortContexts(contexts, nodes[0].operatorContextType);
    }
    // otherwise try to get nearest nodes within the graph 
    return contexts;
};

export const useAutoComplete = (text: string, objectNode: ObjectNode, editing: boolean) => {
    let [autoCompletes, setAutoCompletes] = useState<ContextDefinition[]>([]);
    let { onchainSubPatches } = useStorage();

    useEffect(() => {
        if (text === "") {
            setAutoCompletes([]);
            return;
        }
        let _text = text.split(" ")[0].toLowerCase();
        let options: ContextDefinition[] = [];
        let contexts = sortContexts(getAllContexts(), objectNode);
        for (let context of contexts) {
            let { definitions } = context;
            for (let name in definitions) {
                let _name = name.toLowerCase();
                if (_name.startsWith(_text)) {
                    let definition: Definition = definitions[name];
                    options.push({
                        definition,
                        context
                    })
                }
            }
        }
        /*
        let payload = window.localStorage.getItem(`subpatch`);
        let list: string[] = [];
        if (payload) {
            list = Array.from(new Set(JSON.parse(payload)));
        }
        */
        for (let elem of [...onchainSubPatches].reverse()) {
            let _name = elem.name.toLowerCase();
            if (_name.startsWith(_text)) {
                options.push({
                    definition: {
                        description: "user generated supatch #" + elem.id,
                        name: elem.name as string,
                        numberOfInlets: 0,
                        numberOfOutlets: 0,
                        id: elem.id
                    }
                });
            }
        }

        setAutoCompletes(options);
    }, [text, setAutoCompletes, editing]);

    return { autoCompletes, setAutoCompletes };
};
