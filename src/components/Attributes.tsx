import React, { useEffect, useCallback, useState } from 'react';
import { getOperatorContext } from '@/lib/nodes/context';
import { ObjectNode, MessageNode } from '@/lib/nodes/types';
import Attribute from './Attribute';
import { useSelection } from '@/contexts/SelectionContext';


const Attributes: React.FC<{ node: ObjectNode | MessageNode }> = ({ node }) => {
    let attributes = node.attributes;
    let attributeNames = Object.keys(attributes);

    let doc = (node as ObjectNode).operatorContextType !== undefined ?
        getOperatorContext((node as ObjectNode).operatorContextType).lookupDoc((node as ObjectNode).name || "") : undefined;
    return (
        <div
            onClick={(e: any) => e.stopPropagation()}
            className=" p-1">
            <div className="w-full h-full text-xs">
                <div
                    style={{ borderBottom: "1px solid #4f4f4f" }}
                    className="p-2 w-full text-xs">
                    <div className="text-base">{(node as ObjectNode).name}</div>
                    {doc && <div className="mt-2 w-52">{doc.description}</div>}
                </div>
                {attributeNames.map(
                    attribute => <Attribute attribute={attribute} node={node} />)}
            </div>
        </div>
    );
}
export default Attributes;
