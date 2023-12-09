import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePosition } from '@/contexts/PositionContext';
import { ObjectNode } from '@/lib/nodes/types';

const Comment: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
    let [text, setText] = useState<string>(objectNode.text.slice("comment".length + 1));
    let { sizeIndex } = usePosition();
    let textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleCommentChange = useCallback((e: any) => {
        setText(e.target.value);
        objectNode.text = "comment " + e.target.value;
    }, [setText, objectNode]);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height

            // Adjusting for padding and borders if necessary
            const borderTop = parseInt(window.getComputedStyle(textarea).borderTopWidth, 10);
            const borderBottom = parseInt(window.getComputedStyle(textarea).borderBottomWidth, 10);
            const paddingTop = parseInt(window.getComputedStyle(textarea).paddingTop, 10);
            const paddingBottom = parseInt(window.getComputedStyle(textarea).paddingBottom, 10);

            const totalVerticalPaddingAndBorder = borderTop + borderBottom + paddingTop + paddingBottom;

            // Use setTimeout to allow the browser to render the height reset
            //setTimeout(() => {
            textarea.style.height = `${textarea.scrollHeight - totalVerticalPaddingAndBorder}px`;
            console.log('adjusting height=', textarea.style.height);
            //}, 0);
        }
    };

    let size = sizeIndex[objectNode.id];

    useEffect(() => {
        console.log('size changed...');
        adjustHeight();
    }, [text, size]);


    return (
        <div className="w-full h-full">
            <textarea
                ref={textareaRef}
                className="outline-none bg-transparent text-white p-2 border-box overflow-hidden"
                value={text}
                onChange={handleCommentChange}
                placeholder="comment"
            />
        </div>
    );
}
export default Comment;
