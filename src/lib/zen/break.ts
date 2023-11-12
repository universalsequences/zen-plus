import { UGen, Generated, Arg } from './zen';
import { Context } from './context';

export const breakIf = (condition: Arg): UGen => {
    return (context: Context): Generated => {
        let cond = context.gen(condition);
        let code = `
if (${cond.variable}) {
  break;
}
`
        return context.emit(code, "", cond);
    };
};
