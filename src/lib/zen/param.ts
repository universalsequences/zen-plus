import { UGen, Arg } from './zen';
import { history, History } from './history'

export type ParamGen = UGen & {
    set?: (val: number, time?: number) => void,
};

export const param = (val: number, name: string = "hello"): ParamGen => {
    let ssd: History = history(val, { inline: false, name: name });

    let p: ParamGen = ssd();
    p.set = (val: number, time?: number) => {
        ssd.value!(val, time!);
    };

    return p;
};

