import { data, BlockGen } from '../data';

export interface SpiderWeb {
    neighbors: Float32Array;
    coeffs?: Float32Array;
    dampening?: Float32Array;
    maxNeighbors: number;
    size: number;
    neighborsMatrix: Level[];
    radius: number;
    noise?: number;
    data: BlockGen;
    dampeningData: BlockGen;
    pointsData?: BlockGen;
    points?: Float32Array;
}

export type Structure = SpiderWeb;

type Level = number[];

export type Adjacency = {
    [key: number]: number[];
}
const mod = (x: number, n: number): number => ((x % n) + n) % n;

export const createSpiderWeb = (numLevels: number, radius: number): SpiderWeb => {
    // we work by levels
    // starting at the center where its connected very tightly
    let levels = [];
    let center = [];
    let coeffs = [];
    let mapping: Adjacency = {};
    const maxSize = 1 + radius * numLevels;

    const dampening = new Float32Array(maxSize);
    for (let i = 0; i < maxSize; i++) {
        dampening[i] = 1;
    }


    for (let i = 0; i < radius; i++) {
        let neighbor = i + 1;
        center.push(neighbor);
        if (!mapping[neighbor]) {
            mapping[neighbor] = [];
        }
        mapping[neighbor].push(0);
    }
    for (let i = 0; i < maxSize; i++) {
        coeffs.push(i === 0 || i > radius ? 0 : 1.1172395);
    }
    levels.push(center);
    let levelId = radius + 1;
    let currentId = 1;

    for (let i = 0; i < numLevels; i++) {
        // now that we are here lets work wi the radius
        let nextLevel = 0;
        let seed = Math.random();
        for (let j = 0; j < radius; j++) {
            let n1 = currentId + mod(j + 1, radius); // right
            let n2 = currentId + mod(j - 1, radius); // left
            let id = currentId + j; // current
            nextLevel = levelId + j; // next
            let prev = mapping[id]; // prev

            let _level = new Array(radius).fill(-1);
            _level[0] = prev === undefined ? 0 : prev[0];
            _level[1] = nextLevel < maxSize ? nextLevel : n1;
            _level[2] = n2;
            _level[3] = nextLevel < maxSize ? n1 : -1;

            if (!mapping[nextLevel]) {
                mapping[nextLevel] = [];
            }
            mapping[nextLevel].push(id);
            if (!mapping[n1]) {
                mapping[n1] = [];
            }
            mapping[n1].push(id);

            if (!mapping[n2]) {
                mapping[n2] = [];
            }
            mapping[n2].push(id);

            if (nextLevel >= maxSize) {
                _level[3] = id;
            }

            levels.push(_level);
            let arr = new Array(maxSize).fill(0);
            let levelNumber = i;
            for (let i = 0; i < _level.length; i++) {
                arr[_level[i]] = 0.6; //coeffs.length % 10 < 4 ? 0 : .6;// Math.random();
            }

            if (nextLevel < maxSize) {
                if (levelNumber <= 1) {
                    arr[_level[1]] = 4.5;
                } else if (levelNumber < 4) {
                    arr[_level[1]] = .9;
                } else {
                    arr[_level[1]] = 3.2;;

                }
            }

            if (prev !== undefined) {
                for (let _prev of prev) {
                    arr[_prev] = coeffs[_prev * maxSize + currentId + j];
                }
            }


            if (nextLevel >= maxSize) {
                // we are at boundary
                arr[id] = -1;
            }
            coeffs = [...coeffs, ...arr];
        }
        levelId = levelId + radius;
        currentId = currentId + radius;
    }
    let ogLevels = levels;
    levels = levels.flat(4);
    let size = maxSize;

    let cmat = [];
    for (let i = 0; i < coeffs.length; i += size) {
        let c = [];
        for (let j = 0; j < size; j++) {
            c.push(coeffs[i + j]);
        }
        cmat.push(c);
    }

    let maxNeighbors = radius;
    let _coeffs = new Float32Array(coeffs);
    return {
        size,
        maxNeighbors,
        neighbors: new Float32Array(levels),
        dampening,
        coeffs: _coeffs,
        neighborsMatrix: ogLevels,
        radius: radius,
        data: data(size, size, _coeffs, true, "none"),
        dampeningData: data(maxSize, 1, dampening, true, "none")
    }
};
