import { Patch, IOConnection, IOlet, Message, ObjectNode, MessageNode, Node, Attributes } from './types';
import { v4 as uuidv4 } from 'uuid';
import { uuid } from '@/lib/uuid/IDGenerator';

/**
 * all node types must extend this (i.e. ObjectNode and MessageNode) 
 */
export class BaseNode implements Node {
    patch: Patch;
    inlets: IOlet[];
    outlets: IOlet[];
    attributes: Attributes
    id: string;

    constructor(patch: Patch) {
        this.id = uuid();
        this.patch = patch;
        this.inlets = [];
        this.outlets = [];
        this.attributes = {};
    }

    send(outlet: IOlet, msg: Message) {
        let { connections } = outlet;

        for (let connection of connections) {
            let { source, destination, destinationInlet } = connection;
            if (source as any === this && destinationInlet) {
                destination.receive(destinationInlet, msg);
            }
        }
    }

    newInlet(name?: string) {
        this.newIOlet(this.inlets, name);
    }

    newOutlet(name?: string) {
        this.newIOlet(this.outlets, name);
    }

    newIOlet(iolets: IOlet[], name?: string) {
        let id = uuidv4();
        let inlet: IOlet = {
            id,
            name: name,
            connections: []
        };
        iolets.push(inlet);
    }

    connect(destination: Node, inlet: IOlet, outlet: IOlet, compile = true) {
        let connection: IOConnection = {
            source: this,
            destination,
            sourceOutlet: outlet,
            destinationInlet: inlet
        };

        outlet.connections.push(connection);
        inlet.connections.push(connection);

        if (compile) {
            this.patch.recompileGraph();
        }
        return connection;
    }

    disconnect(connection: IOConnection) {
        for (let outlet of this.outlets) {
            outlet.connections = outlet.connections.filter(
                x => x !== connection);
        }

        let dest = connection.destination;
        for (let inlet of dest.inlets) {
            inlet.connections = inlet.connections.filter(
                x => x !== connection);
        }

        this.patch.recompileGraph();
    }

    receive(inlet: IOlet, msg: Message) {
        inlet.lastMessage = msg;

        /** rest gets implemented by other extended classes */
    }
}
