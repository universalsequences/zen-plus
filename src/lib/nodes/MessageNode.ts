import { Patch, IOlet, Coordinate, MessageNode, Message } from './types';
import { BaseNode } from './BaseNode';
import { v4 as uuidv4 } from 'uuid';

const TRIGGER = 'trigger';
const REPLACE = 'replace';

export default class MessageNodeImpl extends BaseNode implements MessageNode {
    id: string;
    message?: Message;
    position: Coordinate;
    zIndex: number;

    constructor(patch: Patch) {
        super(patch);
        this.id = uuidv4();
        this.position = { x: 0, y: 0 };
        this.zIndex = 0;

        this.newInlet(TRIGGER);
        this.newInlet(REPLACE);
        this.newOutlet("message result");
    }

    receive(inlet: IOlet, message: Message) {
        switch (inlet.name) {
            case TRIGGER:
                if (this.message) {
                    this.send(this.outlets[0], this.message);
                }
                break;
            case REPLACE:
                this.message = message;
                break;
        }
    }
}
