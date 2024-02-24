
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ValueProvider } from '@/contexts/ValueContext';
import { ObjectNode, Patch, Coordinate, Size, MessageNode, MessageType } from '@/lib/nodes/types';
import MessageNodeComponent from './MessageNodeComponent';

const MessageNodeWrapper: React.FC<{ messageNode: MessageNode }> = ({ messageNode }) => {
    return (
        <ValueProvider node={messageNode}>
            <MessageNodeComponent messageNode={messageNode} />
        </ValueProvider>
    );
}

export default MessageNodeWrapper;
