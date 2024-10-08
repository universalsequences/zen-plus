import { UGen, Arg } from "./zen";
import { history, History } from "./history";

export type ParamGen = UGen & {
  set?: (val: number, time?: number) => void;
  getInitData?: () => number;
};

export const param = (
  val: number,
  name: string = "hello",
  min?: number,
  max?: number,
): ParamGen => {
  let ssd: History = history(val, { inline: false, name: name, min, max });

  let p: ParamGen = ssd();
  p.set = (val: number, time?: number) => {
    if (isNaN(val)) {
      val = 0;
    }
    ssd.value!(val, time!);
  };

  p.getInitData = () => {
    return ssd.getInitData!();
  };

  return p;
};
