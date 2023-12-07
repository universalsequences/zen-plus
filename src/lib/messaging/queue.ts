import { Message } from '@/lib/nodes/types';
const EMPTY_LIST: any = [];


type Messages = {
    [x: string]: Message[]
}

type MessageFunc = (msg: Message) => void;
type Subscriptions = {
    [x: string]: MessageFunc[];
};

const MessageQueue = () => {
    // a map between message type and list of messages where last element is the last message
    let messages: Messages = {};

    // list of functions that should be cleared 
    let badSubscribers: MessageFunc[] = [];

    // a map between message type and list of subscribers (which are simply functions)
    let subscribers: Subscriptions = {};

    const publish = (type: string, message: Message) => {
        if (!messages[type]) {
            messages[type] = [];
        }
        messages[type].unshift(message);
        if (messages[type].length > 2) {
            messages[type].pop();
        }
        notify(type, message);
    };

    const notify = (type: any, message: any) => {
        if (subscribers[type]) {
            subscribers[type].forEach(
                fn => fn(message));
        }
    };

    const subscribe = (type: string, fn: MessageFunc) => {
        if (!subscribers[type]) {
            subscribers[type] = [];
        }
        subscribers[type] = [fn, ...subscribers[type]];
        return () => unsubscribe(type, fn);
    };

    const unsubscribe = (type: string, fn: MessageFunc) => {
        if (!subscribers[type]) {
            return;
        }
        subscribers[type] = subscribers[type].filter(
            f => f !== fn);
    };

    const read = (type: string) => {
        // return all messages of that type
        return messages[type] || EMPTY_LIST;
    };

    // empties a message type and returns all the messages
    const drain = (type: any) => {
        let drained = read(type);
        if (messages[type]) {
            messages[type].length = 0;
        }
        return drained;
    };

    const clearQueue = () => {
        clearObj(messages);
        for (let sub of badSubscribers) {
            for (let type in subscribers) {
                subscribers[type] = subscribers[type].filter(
                    fn => fn !== sub);
            }
        }
        badSubscribers.length = 0;
    };

    return { messages, subscribers, notify, subscribe, publish, read, drain, clearQueue, unsubscribe };
};

export const { messages, subscribers, notify, unsubscribe, subscribe, publish, read, drain, clearQueue } = MessageQueue();

export const latest = (type: any) => read(type)[0];

export const clearObj = (obj: any) => {
    var props = Object.getOwnPropertyNames(obj);
    for (var i = 0; i < props.length; i++) {
        delete obj[props[i]];
    }
    return obj;
};

