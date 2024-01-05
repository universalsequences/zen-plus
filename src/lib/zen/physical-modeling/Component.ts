import { data, peek, BlockGen, poke, Gettable } from '../data';
import { print } from '../print';
import { Structure } from './web-maker'
import { breakIf } from '../break';
import { zswitch } from '../switch'
import { tanh, floor, clamp, mult, atan, mix, sqrt, exp, max, add, sub, div, pow, min, abs, sign } from '../math'
import { neq, lte, gte, gt, eq, and } from '../compare'
import { sumLoop } from '../loop'
import { noise } from '../noise'
import { scale } from '../scale'
import { accum } from '../accum'
import { s } from '../seq'
import { UGen, Arg } from '../zen';

export interface Membrane {
    membrane: UGen;
    data: Gettable<Float32Array>;
}

export interface Material {
    pitch: Arg;
    release: Arg;
    x: Arg;
    y: Arg;
    noise: Arg;
    couplingCoefficient: Arg
}

interface Connection {
    component: Component;
    neighbors: BlockGen;
}

export class Component {
    isEntryPoint: boolean;
    material: Material;
    web: Structure;
    neighbors: BlockGen;
    coeffs: BlockGen;
    u: BlockGen;
    currentChannel: UGen;
    dampening: BlockGen;
    prevChannel: UGen;
    nt2: UGen; // damepning
    p_eff: UGen; // pitch
    connections: Connection[];
    u_center: UGen;
    p0: UGen;
    tension: UGen;
    excitementEnergy?: UGen;

    constructor(material: Material, web: Structure, isEntryPoint: boolean) {
        this.connections = [];
        this.isEntryPoint = isEntryPoint;

        this.material = material;
        console.log('component initialized with material = ', this.material);

        this.web = web;
        this.neighbors = data(web.size * web.maxNeighbors, 1, web.neighbors, true, "none");
        this.coeffs = web.data;
        this.dampening = web.dampeningData;

        // the dampening- i.e. "the release"
        this.nt2 = mix(
            pow(2, -8),
            pow(2, -13),
            material.release);

        // contains the displacement data for 3 time steps (now, now-1, now-2)
        this.u = data(web.size, 3, undefined, true, "none");

        // keep track of current index (so we know what channel to peek into U)
        this.currentChannel = accum(1, 0, { min: 0, max: 2, exclusive: false });
        this.prevChannel = sub(this.currentChannel, 1)

        // using current index grab the center value for "now"
        this.u_center = peek(this.u, 0, this.prevChannel);

        let tense = 0.0999151;
        this.tension = mix(pow(2, -12), pow(2, -5), tense);
        this.p0 = mix(.00000000000011044095, 0.01, material.pitch);

        this.p_eff = min(0.47, add(this.p0, pow(mult(this.u_center, this.tension, 1), 2)));
    }

    get size() {
        return this.web.size;
    }

    /**
     * Calculate the entire displacement across the network
     */
    gen(input: UGen) {
        if (this.isEntryPoint) {
            this.excitementEnergy = input;
        }
        return s(
            this.currentChannel,
            this.prevChannel, // problem is prev channel is wrong?,
            input,
            this.nt2,
            this.u_center,
            this.tension,
            this.p0,
            this.material.couplingCoefficient,
            this.p_eff,
            mult(
                div(200, this.size),
                sumLoop(
                    { min: 0, max: this.size },
                    (idx: UGen) => this.nodeDisplacement(input, idx)
                )
            ));
    }

    // calculate the displacement for one node
    nodeDisplacement(input: UGen, idx: UGen) {
        let val: UGen = peek(this.u, idx, this.prevChannel);

        /**
         * Creating connections:
         * When connected to an inbound component, we need to:
         * 1. Calculate the neighbors sum in THIS component along with
         * 2. Calculate the neighbors sum in the other component (via this node)
         * 
         * Sum #1 and #2 
         * Then use the correct coefficients for dampening and pitch for this 
         * component.
         *
         * So if we create a for loop with all the params
         * and on each iteration w simply get the PARAMS object
         * containing all the information needed to run this loop* in 
         * this way
         */

        let neighborsEnergy: UGen = this.calculateNeighborsEnergy(idx, val, input);

        let energy = mult(input, this.lerpExcitementEnergy(idx, this.material.x, this.material.y));

        let prev2 = peek(this.u, idx, sub(this.currentChannel, 2));

        let nt2 = mix(
            pow(2, -8),
            pow(2, -13),
            mult(peek(this.dampening, idx, 0),
                this.material.release));

        let current = div(
            add(
                mult(2, val),
                mult(
                    this.p_eff,
                    add(neighborsEnergy, mult(1, energy), mult(-4, val))
                ),
                mult(-1, sub(1, nt2), prev2) // dampening term
            ),
            add(1, nt2) // dampening term
        );

        return s(
            //poke(this.u, idx, this.currentChannel, tanh(current)), //min(1, max(-1, current))),
            //poke(this.u, idx, this.currentChannel, min(1, max(-1, current))),
            // TODO: allow defining your own functions here for how to handle overflow (right now we do a simple
            // atan sigmoid, but should honestly do something more clever
            poke(this.u, idx, this.currentChannel, div(atan(mult(0.6366197723675814, current)), 0.6366197723675814)),
            current);
    }

    lerpExcitementEnergy(idx: UGen, x: Arg, y: Arg): UGen {
        // we "excite" the membrane at an x,y point, though we need
        // to actually excite multiple nodes based on how close they are to that point
        let xidx = mult(idx, 2);
        let x1 = peek(this.web.pointsData!, xidx, 0);
        let y1 = peek(this.web.pointsData!, add(xidx, 1), 0);
        let distance = sqrt(
            add(
                pow(sub(x1, x), 2),
                pow(sub(y1, y), 2)));
        let maxDistance = 80;
        let energy = clamp(sub(1, div(distance, maxDistance)), 0, 1);
        const neg = (x: Arg) => mult(-1, x);
        let gaussianEnergy = exp(div(neg(pow(distance, 2)),
            mult(2, pow(div(maxDistance, 2), 2))));
        return energy;

    }

    calculateNeighborsEnergy(idx: UGen, val: UGen, input: UGen) {
        let noiseParam = min(20, this.material.noise);
        let noiseFactor = mult(scale(noise(), 0, 1, -1, 1), noiseParam);
        if (this.connections[0] && this.connections[0].component.isEntryPoint) {
            input = this.connections[0].component.excitementEnergy!;
        }

        let neighborsEnergy =
            mult(
                0.5,
                add(
                    mult(mix(pow(input, .5), val, 1), noiseFactor),
                    this.sumNeighbors(
                        idx,
                        this.prevChannel,
                        this.web.maxNeighbors,
                        this.u,
                        this.neighbors,
                        this.coeffs,
                    )));

        for (let connection of this.connections) {
            // if we are currently on a node that is "connected" to another
            // node in another component, then we need to do this:
            // calculate the difference of displacement 
            // multiply it by "coupling coeff" and add it to this neighborsEnergy
            // so first how do we know 
            let { component, neighbors } = connection;
            let connectedIdx = peek(neighbors, idx, 0); // neighbors defines 
            let isConnected = neq(connectedIdx, -1); // -1 means its not connected
            let connectedValue = peek(component.u, connectedIdx, component.prevChannel);
            let displacementDiff = sub(connectedValue, val);
            let couplingForce = zswitch(
                isConnected,
                mult(displacementDiff, this.material.couplingCoefficient),
                0);

            neighborsEnergy = add(
                neighborsEnergy,
                couplingForce);
        }
        return neighborsEnergy;
    }

    /**
     * Calculates the sum of neighbors of a particular node (indexed by idx)
     * The parameters by default refer to this component, however,
     * when calculating inter-component neighbors, we will pass in other
     * parameters (taken from the other component wrt to this one).
     */
    sumNeighbors(
        idx: Arg,
        prevChannel: Arg = this.prevChannel,
        maxNeighbors: number,
        u: BlockGen = this.u,
        neighbors: BlockGen = this.neighbors,
        coeffs: BlockGen = this.coeffs,
    ) {
        return sumLoop({
            min: 0,
            max: maxNeighbors + 1
        }, (i) => {

            // whats the "index" of the i'th neighbor, according to
            // the "neighbors" matrix

            let neighbor = peek(
                neighbors,
                add(mult(maxNeighbors, idx), i), 0);

            // whats the "coeff" of this neighbor w.r.t to this current node
            let coeff = peek(coeffs, neighbor, idx);

            // if neighbor is not -1 then we have a valid neighbor 
            return s(
                //(neighbors === this.neighbors ? breakIf(and(gte(idx, maxNeighbors), gt(i, 3))) : add(0)),
                zswitch(
                    neq(neighbor, -1),
                    mult(
                        zswitch(
                            eq(coeff, -1),
                            mult(-1, peek(u, idx, prevChannel)),
                            // the value of the neighbor in previous time-step
                            peek(u, neighbor, prevChannel)),
                        coeff // the coefficient for that neighbor & idx combo (multiply value by that)
                    ),
                    0))
        });
    }

    bidirectionalConnect(component: Component) {
        // what we need to do is this...
        // generate 2 way directions

        let neighborsA: Float32Array; //  for component
        let neighborsB: Float32Array; // for this
        if (component.size < this.size) {
            let [A, B] = generateStructure(component, this);
            neighborsA = A;
            neighborsB = B;
        } else {
            let [B, A] = generateStructure(this, component);
            neighborsA = A;
            neighborsB = B;
        }

        let A = data(neighborsA.length, 1, neighborsA, true, "none");
        let B = data(neighborsB.length, 1, neighborsB, true, "none");

        this.connections.push({ component, neighbors: B });
        component.connections.push({ component: this, neighbors: A });
    }

    /**
     * Quick generate structure between two components
     * if theres no neighbor then use -1
    generateStructure(component: Component): Structure {
        let neighbors = new Float32Array(component.size);
        let coeffs = new Float32Array(component.size);

        // neighbors is simply a mapping from idx -> neighborIdx
        for (let i = 0; i < this.size; i++) {
            neighbors[i] = i; //component.size - 1 - i;
            coeffs[i] = .3;
        }

        // this structure is used
        return {
            radius: 10,

            neighbors,
            coeffs,
            size: this.size,
            maxNeighbors: 2,
            neighborsMatrix: [],
            noise: 0
        };
    }
     */
}

type Structures = [Float32Array, Float32Array];
/** Assumes A.size < B.size */

/*if (component.size < this.size) {*/
// A.size < B.size
export const generateStructure = (A: Component, B: Component): Structures => {
    // the component being connected is smaller then "this" one
    // A -> component/
    // B -> this
    let neighborsA = new Float32Array(A.size);
    for (let i = 0; i < A.size; i++) {
        neighborsA[i] = B.size - 1 - i;
    }
    let neighborsB = new Float32Array(B.size);
    let sizeDiff = B.size - A.size;
    for (let i = 0; i < B.size; i++) {
        if (i < sizeDiff) {
            neighborsB[i] = -1;
        } else {
            neighborsB[i] = B.size - i - 1;
        }
    }
    return [neighborsA, neighborsB];
}
