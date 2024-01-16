import {
    SerializedOutlet,
    AttributeCallbacks,
    AttributeOptions,
    Patch, IOConnection, ConnectionType, SerializedConnection, IOlet, Message, ObjectNode, MessageNode, Node, Attributes
} from './types';
import { OperatorContextType } from './context';
import { v4 as uuidv4 } from 'uuid';
import { uuid } from '@/lib/uuid/IDGenerator';

/**
 * all node types must extend this (i.e. ObjectNode and MessageNode) 
 */
export class BaseNode implements Node {
    patch: Patch;
    inlets: IOlet[];
    outlets: IOlet[];
    attributes: Attributes;
    attributeCallbacks: AttributeCallbacks;
    attributeOptions: AttributeOptions;
    attributeDefaults: Attributes;;
    id: string;

    constructor(patch: Patch) {
        this.id = uuid();
        this.patch = patch;
        this.inlets = [];
        this.outlets = [];
        this.attributes = {};
        this.attributeCallbacks = {};
        this.attributeOptions = {};
        this.attributeDefaults = {};
    }

    newAttribute(name: string, defaultValue: string | number | boolean, callback?: (x: string | number | boolean) => void) {
        this.attributes[name] = defaultValue;
        if (defaultValue !== undefined) {
            this.attributeDefaults[name] = defaultValue;
        }

        if (callback) {
            this.attributeCallbacks[name] = callback;
        }
    };

    setAttribute(name: string, value: string | number | boolean) {
        this.attributes[name] = value;
        if (this.attributeCallbacks[name]) {
            this.attributeCallbacks[name](value);
        }
    };

    send(outlet: IOlet, msg: Message) {
        let { connections } = outlet;

        for (let connection of connections) {
            let { source, destination, destinationInlet } = connection;
            if (source as any === this && destinationInlet) {
                destination.receive(destinationInlet, msg);
            }
        }
    }

    newInlet(name?: string, connectionType?: ConnectionType) {
        this.newIOlet(this.inlets, name, connectionType);
    }

    newOutlet(name?: string, connectionType?: ConnectionType) {
        this.newIOlet(this.outlets, name, connectionType);
    }

    newIOlet(iolets: IOlet[], name?: string, connectionType?: ConnectionType) {
        let id = uuidv4();
        let inlet: IOlet = {
            id,
            name: name,
            connections: [],
            connectionType
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

        if (inlet.connectionType === ConnectionType.AUDIO &&
            outlet.connectionType === ConnectionType.AUDIO) {
            this.connectAudioNode(connection);
        } else if (compile && (outlet.connectionType === ConnectionType.ZEN || outlet.connectionType === ConnectionType.GL || inlet.connectionType === ConnectionType.ZEN || inlet.connectionType === ConnectionType.GL)) {
            this.patch.recompileGraph();
        }
        return connection;
    }

    connectAudioNode(connection: IOConnection) {
        let { destination, sourceOutlet, destinationInlet } = connection;
        let sourceNode = (this as any as ObjectNode).audioNode;
        let destNode = (destination as any as ObjectNode).audioNode;
        if (sourceNode && destNode) {
            let splitter = this.patch.audioContext.createChannelSplitter(this.outlets.length);
            sourceNode.connect(splitter);
            splitter.connect(destNode, this.outlets.indexOf(sourceOutlet), destination.inlets.indexOf(destinationInlet));
        }
    };

    disconnect(connection: IOConnection, compile: boolean = true) {
        for (let outlet of this.outlets) {
            outlet.connections = outlet.connections.filter(
                x => x !== connection);
        }

        let dest = connection.destination;
        for (let inlet of dest.inlets) {
            inlet.connections = inlet.connections.filter(
                x => x !== connection);
        }

        console.log("disconnecting so recompile");

        if (compile && connection.destinationInlet.connectionType === ConnectionType.ZEN) {
            console.log("connecting so recompiling");
            this.patch.recompileGraph();
        }
    }

    receive(inlet: IOlet, msg: Message) {
        inlet.lastMessage = msg;

        /** rest gets implemented by other extended classes */
    }

    getConnectionsJSON(): SerializedOutlet[] {
        let json: SerializedOutlet[] = [];
        for (let i = 0; i < this.outlets.length; i++) {
            let outlet = this.outlets[i];
            let outletJson = [];
            for (let connection of outlet.connections) {
                let { destination, destinationInlet } = connection;
                let inletIndex = destination.inlets.indexOf(destinationInlet);
                let _json: SerializedConnection = {
                    destinationId: destination.id,
                    //destinationInlet: inletIndex
                };
                if (inletIndex > 0) {
                    _json.destinationInlet = inletIndex;
                }
                if (connection.segmentation) {
                    _json.segmentation = connection.segmentation;
                }
                outletJson.push(_json);
            }
            let x: SerializedOutlet = { connections: outletJson };
            if (i > 0) {
                x.outletNumber = i;
            }
            json.push(x);
        }
        return json;
    }


}
