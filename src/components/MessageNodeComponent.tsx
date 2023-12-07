import React, { useRef, useCallback, useEffect, useState } from 'react';
import MessageBox from './MessageBox';
import { useSelection } from '@/contexts/SelectionContext';
import Attributes from './Attributes';
import { ContextMenu, useThemeContext } from '@radix-ui/themes';
import { useMessage } from '@/contexts/MessageContext';
import { ObjectNode, Patch, Coordinate, Size, MessageNode, MessageType } from '@/lib/nodes/types';
import PositionedComponent from './PositionedComponent';
import NumberBox from './ux/NumberBox';

const MessageNodeComponent: React.FC<{ messageNode: MessageNode }> = ({ messageNode }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const { lockedMode, setSelectedNodes, selectedNodes } = useSelection();
    const [value, setValue] = useState<number>(messageNode.message as number || 0);
    const { messages } = useMessage();
    let lockedModeRef = useRef(lockedMode);
    useEffect(() => {
        lockedModeRef.current = lockedMode;
    }, [lockedMode]);

    let message = messages[messageNode.id];
    if (ArrayBuffer.isView(message)) {
        message = Array.from(message);
    }

    const onValueChange = useCallback((value: number) => {
        // we need to send this over to messageNode
        messageNode.receive(messageNode.inlets[1], value);
        if (!messageNode.attributes["is parameter"]) {
            messageNode.receive(messageNode.inlets[0], "bang");
        }
    }, [messageNode]);

    let isSelected = selectedNodes.includes(messageNode);
    return React.useMemo(() => {
        return (
            <PositionedComponent
                lockedModeRef={lockedModeRef}
                node={messageNode}>
                <ContextMenu.Root>
                    <ContextMenu.Content
                        style={{ zIndex: 10000000000000 }}
                        color="indigo"
                        className="object-context rounded-lg">
                        <Attributes node={messageNode} />
                    </ContextMenu.Content>
                    <ContextMenu.Trigger
                        className="ContextMenuTrigger relative">
                        <div
                            ref={ref}
                            className="flex h-full w-full flex-1 whitespace-nowrap relative">
                            <>
                                {messageNode.messageType === MessageType.Number ? <NumberBox
                                    lockedModeRef={lockedModeRef}
                                    isSelected={isSelected}
                                    min={messageNode.attributes.min as number}
                                    max={messageNode.attributes.max as number}
                                    value={value} setValue={(x: number) => {
                                        setValue(x);
                                        onValueChange(x);
                                    }} round={false} /> :
                                    <MessageBox
                                        message={message}
                                        isSelected={isSelected}
                                        lockedModeRef={lockedModeRef}
                                        messageNode={messageNode} />}
                                {messageNode.attributes["scripting name"] !== "" &&
                                    <div className="absolute top-1 -right-10 h-7 text-white text-xs w-8">
                                        {messageNode.attributes["scripting name"]}
                                    </div>}
                            </>
                        </div>
                    </ContextMenu.Trigger>
                </ContextMenu.Root>
            </PositionedComponent>);
    }, [isSelected, message, value]);

};


export default MessageNodeComponent;
