import { Arg } from './zen';
import { cos, mult } from './math';
import { scale } from './scale';

export const sine = (ramp: Arg) => {
    return scale(
        cos(mult(Math.PI, ramp)),
        1, -1, 0, 1)
}
