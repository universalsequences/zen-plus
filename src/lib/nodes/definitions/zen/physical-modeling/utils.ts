import { createSpiderWeb, SpiderWeb } from '@/lib/zen/physical-modeling/web-maker';
const RATIO = 5;
const TERM = 1;

interface Point {
    x: number;
    y: number;
}

const getPt = (num: number, web: SpiderWeb, SIZE: number): Point => {
    let { neighborsMatrix, radius, coeffs, size } = web;
    let i = 0;
    let dist = 0;
    let count = 0;
    let pts = [];
    /**
     * 
     * xx = x + (d * cos(alpha))
     * yy = y + (d * sin(alpha))
     */

    let center = { x: SIZE / 2, y: SIZE / 2 };
    let lastLevel = [];
    for (let level of neighborsMatrix) {

        let alpha = 2 * Math.PI * count / radius;
        pts.push({
            x: center.x + dist * Math.cos(alpha),
            y: center.y + dist * Math.sin(alpha),
        })


        // dist gives us how far from center we should be
        // count / radius tells us how to do the angle

        if (count > radius - TERM) {
            count = 0;
            lastLevel = [];
            let highest = Math.max(...(level.filter(x => x != -1 && coeffs && coeffs[x * size + i] > 0)))
            let index = highest; //level.indexOf(highest);
            highest = index * size + i;
            if (coeffs) {
                dist += (SIZE / RATIO) / coeffs[highest];
            }
        }
        if (i === 0) {
            count = 0;
            let highest = Math.max(...level)
            let index = highest; //level.indexOf(highest);
            highest = i * size + index;
            if (coeffs) {
                dist += (SIZE / RATIO) / coeffs[highest];
            }
        }
        count++;
        i++;
    }
    return pts[num];
}

const SIZE = 300;

export const getPoints = (web: SpiderWeb): Float32Array => {
    let { neighborsMatrix, radius, coeffs, size } = web;
    let i = 0;
    let dist = 0;
    let count = 0;
    let pts = [];
    /**
     * 
     * xx = x + (d * cos(alpha))
     * yy = y + (d * sin(alpha))
     */
    let center = { x: SIZE / 2, y: SIZE / 2 };
    let lastLevel = [];
    for (let level of neighborsMatrix) {

        let alpha = 2 * Math.PI * count / radius;
        let pt = {
            x: center.x + dist * Math.cos(alpha),
            y: center.y + dist * Math.sin(alpha),
        };
        pts.push(pt)

        if (count > radius - TERM) {
            count = 0;
            lastLevel = [];
            let highest = Math.max(...(level.filter(x => x != -1 && coeffs && coeffs[x * size + i] > 0)))
            let index = highest; //level.indexOf(highest);
            highest = index * size + i;
            if (coeffs) {
                dist += (SIZE / RATIO) / coeffs[highest];
            }
        }
        let _i = 0;
        for (let l of level) {
            let _pt = getPt(l, web, SIZE);
            if (coeffs) {
                let coeff = coeffs[l * size + i];
            }
            let idx = l * size + i;
            _i++;
        }


        // dist gives us how far from center we should be
        // count / radius tells us how to do the angle


        if (i === 0) {
            count = 0;
            let highest = Math.max(...level)
            let index = highest; //level.indexOf(highest);
            highest = i * size + index;
            if (coeffs) {
                dist += (SIZE / RATIO) / coeffs[highest];
            }
        }
        count++;
        i++;
    }

    // now given the points we need to turn it into an array
    let arr = new Float32Array(pts.length * 2);
    for (let i = 0; i < pts.length; i++) {
        arr[2 * i] = pts[i].x;
        arr[2 * i + 1] = pts[i].y;
    }
    return arr;
};
