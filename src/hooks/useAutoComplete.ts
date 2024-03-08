import React, { useEffect, useState } from 'react';
import { useStorage } from '@/contexts/StorageContext';
import { API, Definition } from '@/lib/docs/docs';
import { OperatorContextType, OperatorContext, getAllContexts } from '@/lib/nodes/context';
import { NodeFunction, SubPatch, ObjectNode } from '@/lib/nodes/types';

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

    let subpatch = (node.patch as SubPatch);
    if (subpatch.patchType !== undefined && subpatch.patchType !== OperatorContextType.ZEN) {
        return _sortContexts(contexts, subpatch.patchType);
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

type Checker = (x: string, y: string) => boolean;
const match = (_text: string, contexts: OperatorContext[], check: Checker): ContextDefinition[] => {
    let options = [];
    for (let context of contexts) {
        let { definitions } = context;
        for (let name in definitions) {
            let _name = name.toLowerCase();
            if (check(_name, _text)) { //_name.startsWith(_text)) {
                let definition: Definition = definitions[name];
                options.push({
                    definition,
                    context
                })
            }
        }
    }
    return options;
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
        if (!(objectNode.patch as SubPatch).parentNode) {
            contexts = contexts.filter(x => x.type !== OperatorContextType.ZEN);
        }
        let startsWithMatches = match(_text, contexts, (a: string, b: string) => a.startsWith(b));;
        let perfectMatches = match(_text, contexts, (a: string, b: string) => b === a);;

        if (text.includes("zen")) {
            // need to add this one
            let allContexts = getAllContexts();
            let context = allContexts.find(x => x.type === OperatorContextType.ZEN);
            if (context) {
                let definition = context.definitions["zen"];
                options.push({
                    definition,
                    context
                });
            }
        }
        options = [...options, ...perfectMatches, ...startsWithMatches];

        // make sure theres no duplicates
        let _options: ContextDefinition[] = [];
        for (let option of options) {
            if (!_options.some(x => x.context === option.context &&
                x.definition === option.definition)) {
                _options.push(option);
            }
        }
        options = _options;
        /*
        let containsMatch = [];
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
        */
        /*
        let payload = window.localStorage.getItem(`subpatch`);
        let list: string[] = [];
        if (payload) {
            list = Array.from(new Set(JSON.parse(payload)));
        }
        */
        for (let elem of [...onchainSubPatches]) {
            let _name = elem.name.toLowerCase();
            if (_name.includes(_text)) {
                options.push({
                    definition: {
                        description: "user generated supatch #" + elem.id,
                        name: elem.name as string,
                        file: elem,
                        numberOfInlets: 0,
                        numberOfOutlets: 0,
                        id: elem.id
                    }
                });
            }
        }

        if (!isNaN(parseFloat(_text))) {
            options = [];
        }
        setAutoCompletes(options);
    }, [text, setAutoCompletes, editing]);

    return { autoCompletes, setAutoCompletes };
};

