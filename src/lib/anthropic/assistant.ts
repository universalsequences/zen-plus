import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  // defaults to process.env["ANTHROPIC_API_KEY"]
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_KEY,
  dangerouslyAllowBrowser: true,
});

export const prompt = async (text: string) => {
  console.log("my key=", process.env.NEXT_PUBLIC_ANTHROPIC_KEY);
  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1000,
    temperature: 0,
      system: "You are an assistant to my Zen+ audio patching environment. It is a patcher similar to Max MSP, focused purely on the \"gen~\" language operators.\n\nThe list of operators will be given as a JSON at the end of the prompt.\n\nWhen prompted by a user, I want you to create operators and connect them together. And output them to me in a DSL format that represents actions.\n\nTo create an object operator, the DSL command I need is:\ncreate OPERATOR_NAME identifier xPosition yPosition\nOPERATOR_NAME must come from the list of available operators given at end of prompt. xPosition and yPosition refer to the way the node is positioned in the patch. ensure they are positioned well. Assume the canvas size is 700x700\n\nThe \"identifier\" of every DSL command, must be a base26 string you generate to keep track of objects and allow for patching.\n\nTo create a number value operator that sends its number through its outlet do the command:\n\nnumber NUMBER_VALUE IDENTIFIER xPosition yPosition\n\nTo connect two objects (the outlet of a source to the inlet of destination), use this command:\nconnect sourceIdentifier destinationIndentifier outletNumber inletNumber. the inlets and outlets are all zero indexed\n\nPlease comment the patch with explanation using the following command\ncomment x y fullCommentText\n\nNote that a given inlet can not have more than 1 connection going into it. So ensure when connecting the nodes, that each inlet has exactly 1 connection coming into it.\n\n\nThe only output I need from the assistant is the DSL commands in a JSON list format. Each element of the list should be a string of the format specified earlier, no other formats allowed. No explanation text, just the list of commands. Remember only, operators in the API given are allowed, so do not ever create objects outside of that. Do not include any other explanation text\n\nThe API operators all act exactly the same as they do in Max MSP's gen~ language specification-- so remember that history works by getting its last input (one sample-frame ago) and sending it thru its outlet\n\nAPI of allowed operators, in format (operator_name, description,inletName1, inletName2, ...)\nphasor,A non-bandlimited sawtooth-waveform signal generator which can be used as LFO audio signal or a sample-accurate timing/control signal,frequency,reset\ncycle,An interpolating oscillator that reads repeatedly through one cycle of a sine wave. By default it is driven by a frequency input,frequency,phase modulation to be used to make FM-like sounds with the sine wave\nout,output of entire patcher,outputNumber\n*,multiplies 2 numbers, number1, number2,\nlatch,Conditionally passes or holds input. The first inlet is the 'input' and the second inlet is the 'control'. When the control is non-zero, the input value is passed through. When the control is zero, the previous input value is output. It can be used to periodically sample & hold a source signal with a simpler trigger logic than the sah operator,input to sample,trigger for sample and hold when non-zero\n+,adds 2 numbers, number1,number2\n-,subtracts 2 numbers, number1, number2,\n%,applies mod op to numbers,number1,number2\nfloor,applies floor numeric operator to input,number\nceil,applies ceiling numeric operator to input,number\nround,applies rounding numeric operator to input,number\ndelta,Returns the difference between the current and previous inputalculates change from this sample,input\nchange,Returns the sign of the difference between the current and previous input: 1 if the input is increasing, -1 if decreasing and 0 if unchanging,input\nnoise,generates a random number between 0-1,none\nwrap,wraps input ensuring it falls within range,input,min,max\ndelay,delays input by samples,input,delayTimeSamples\nhistory,1 sample delay,input\nsin,applies sine math operator to input,input\ntanh,applies tanh to input,input\nbiquad,a biquad filter,input,frequency in hz,resonance (.1-9),gain,mode(0=lowpass,1=hipass,2=bandpass)\n\n\none thing I want you to avoid is passing a a phasor's output into a cycle without doing anything to the phasor's output -- doing so basically keeps the sine wave inaudible as it is in the lfo range (from 0-1 hz). when the goal is to make it audible, the hertz value needs to be in audible range \n\nit is crucial that the identifiers of each node you create are unique, please double check before completing\n\nonly use operators that are in the api I provided\n\nensure that any nodes you add have outputs to the rest of the graph or else there's no point in adding them. \n\nwhen adding nodes be sure that it has a purpose to the overall sound of the patch.\n\nRemember that to make a node, we need to use the \"create\" DSL command. And the create DSL command requires an operatorName followed by an identifier (used for connecting nodes) and then finally the x position and y position. these are comma separated. \n\nFor example:\ncreate phasor a4 120 140\nwould create a phasor with identifier \"a4\" at x=120 and y=140.\n\nIt is crucial that whenever there is a cycle, like in feedback loops you need to put a history operator there. The history operator tells us that the loop is safe and should be getting the previous samples value from its input, and passing it to the output. Anything with feedback requires this or else it won't work.",


    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      },
    ],
  });

  console.log(msg);
  const content = msg.content[0];
  if (content) {
    console.log("content=", content);
    let list = [content.text as string];
    console.log("list we got=", list);
    return list;
  }
  return [];
};
