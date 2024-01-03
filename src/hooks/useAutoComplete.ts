import React, { useEffect, useState } from 'react';
import { useStorage } from '@/contexts/StorageContext';
import { API, Definition } from '@/lib/docs/docs';
import { OperatorContext, getAllContexts } from '@/lib/nodes/context';
import { NodeFunction } from '@/lib/nodes/types';

export interface ContextDefinition {
    definition: Definition & { tokenId?: number };
    context?: OperatorContext;
}
export const useAutoComplete = (text: string) => {
    let [autoCompletes, setAutoCompletes] = useState<ContextDefinition[]>([]);
    let { onchainSubPatches } = useStorage();

    useEffect(() => {
        if (text === "") {
            setAutoCompletes([]);
            return;
        }
        let _text = text.split(" ")[0].toLowerCase();
        let options: ContextDefinition[] = [];
        for (let context of getAllContexts()) {
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
        for (let elem of onchainSubPatches) {
            let _name = elem.name.toLowerCase();
            if (_name.startsWith(_text)) {
                options.push({
                    definition: {
                        description: "user generated supatch #" + elem.tokenId,
                        name: elem.name as string,
                        numberOfInlets: 0,
                        numberOfOutlets: 0,
                        tokenId: elem.tokenId
                    }
                });
            }
        }

        setAutoCompletes(options);
    }, [text, setAutoCompletes]);

    return { autoCompletes, setAutoCompletes };
};
