import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ObjectNode } from '@/lib/nodes/types';
import { useInterval } from '@/hooks/useInterval';

const HTMLViewer: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [html, setHtml] = useState('');

    const onTick = useCallback(() => {
        if (objectNode.storedLazyMessage && ref.current) {
            ref.current.innerHTML = objectNode.storedLazyMessage() as string;
        }
    }, [objectNode, setHtml]);

    useInterval(onTick, 40);
    return (<div ref={ref} className="whitespace-break-spaces html-viewer break-words text-wrap w-64 h-64 bg-black" ></div>);
}

export default HTMLViewer;
