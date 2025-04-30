import type { UGen } from "./zen";
import { history, type History } from "./history";

export interface ParamInfo {
  name: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  idx?: number;
}

export type ParamGen = UGen & {
  set?: (val: number, time?: number, invocation?: number) => void;
  getInitData?: () => number;
  getParamInfo?: () => ParamInfo;
};

export const param = (
  val: number,
  name: string = "hello",
  min?: number,
  max?: number,
  mc = false,
): ParamGen => {
  let ssd: History = history(val, { inline: false, name: name, min, max, mc });

  let p: ParamGen = ssd();
  p.set = (val: number, time?: number, invocation?: number) => {
    if (isNaN(val)) {
      val = 0;
    }
    ssd.value!(val, time, invocation);
  };

  p.getInitData = () => {
    return ssd.getInitData!();
  };

  p.getParamInfo = () => {
    const idx = ssd.getIdx?.();
    return {
      idx,
      name,
      min,
      max,
      defaultValue: ssd.getInitData?.(),
    };
  };

  return p;
};
