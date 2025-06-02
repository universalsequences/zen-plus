import OpenAI from "openai";
import { ObjectNode, Patch } from "@/lib/nodes/types";

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface AssistantMessage {
  role: "user" | "assistant";
  message: string;
}

class Assistant {
  assistant?: OpenAI.Beta.Assistant;
  patch: Patch;
  thread: OpenAI.Beta.Thread | undefined;

  nodesAdded: ObjectNode[];
  messages: AssistantMessage[];

  constructor(patch: Patch) {
    this.patch = patch;
    this.thread = undefined;
    this.messages = [];
    this.nodesAdded = [];
  }

  async createThread(prompt: string) {
    if (!this.assistant) {
      await this.setup();
    }
    if (!this.assistant) {
      return;
    }
    this.messages.push({
      role: "user",
      message: prompt,
    });
    if (!this.thread) {
      this.thread = await client.beta.threads.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // store the thread id in database
    } else {
      // Send a message to the thread
      await client.beta.threads.messages.create(this.thread.id, {
        role: "user",
        content: prompt,
      });
    }
    let thread = this.thread;
    console.log("thread", thread);

    let run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: this.assistant.id,
    });

    let status = run.status;
    while (status !== "completed") {
      /*
            if (status === "in_progress" || status === "completed") {
                let steps = await client.beta.threads.runs.steps.list(thread.id, run.id);
                console.log("steps=", steps.data.length);
                let lastStep = undefined
                for (let step of steps.data) {
                    let step_id = step.id
                    let _step = await client.beta.threads.runs.steps.retrieve(thread.id, run.id, step_id);
                    console.log("STEP=", _step);
                    if (_step.step_details.type === "message_creation") {
                        let message_id = _step.step_details.message_creation.message_id;
                        let msg = await client.beta.threads.messages.retrieve(thread.id, message_id);
                        if (msg.content[0] && (msg.content[0] as any).text) {
                            console.log("MSG IT CREATED =", (msg.content[0] as any).text);
                            let x = (msg.content[0] as any).text.value;
                            if (x.includes("create")) {
                                lastStep = x;
                            }
                        }
                        console.log("message returned =", msg);

                    }
                }
                if (lastStep) {
                    this.messages.push({
                        role: "assistant",
                        message: lastStep
                    });
                    return [lastStep];
                }
            }
            */
      let result = await client.beta.threads.runs.retrieve(thread.id, run.id);
      status = result.status;
      console.log(result);
      console.log("status = ", status);
      await sleep(5000);
    }
    let messages = await client.beta.threads.messages.list(thread.id);
    let msgData: string[] = [];
    for (let message of messages.data) {
      let msg = await client.beta.threads.messages.retrieve(thread.id, message.id);
      if (msg.content[0] && (msg.content[0] as any).text) {
        msgData.push((msg.content[0] as any).text.value);
      }
      console.log("message returned =", msg);
    }
    //        window.localStorage.setItem("gpt", JSON.stringify(msgData));
    console.log(msgData);
    this.messages.push({
      role: "assistant",
      message: msgData[0],
    });

    return [msgData[0]];
  }

  async setup() {
    this.assistant = await client.beta.assistants.retrieve("asst_tWRscOq6EBeoV9bGPXSQ2SzR");
    console.log("assistant = ", this.assistant);
    /*
        this.assistant = await client.beta.assistants.create(
            {
                name: "Patcher",
                description: `
You are my zen+ patching assistant. zen+ is a pathcing environment similar to Max MSP.
`,
                model: "gpt-4-1106-preview",
                tools: [{ "type": "code_interpreter" }],
                instructions: `
You are an assistant to my Zen+ audio patching environment. It is a patcher similar to Max MSP, focused purely on the "gen~" language operators.

The list of operators will be given as a JSON at the end of the prompt.

When prompted by a user, I want you to create operators and connect them together. And output them to me in a DSL format that represents actions.

To create an object operator, the DSL command I need is:
create OPERATOR_NAME identifier xPosition yPosition
OPERATOR_NAME must come from the list of available operators given at end of prompt. xPosition and yPosition refer to the way the node is positioned in the patch. ensure they are positioned well. Assume the canvas size is 700x700

The "identifier" of every DSL command, must be a base26 string you generate to keep track of objects and allow for patching.

To create a number value operator that sends its number through its outlet do the command:

number NUMBER_VALUE IDENTIFIER xPosition yPosition

To connect two objects (the outlet of a source to the inlet of destination), use this command:
connect sourceIdentifier destinationIndentifier outletNumber inletNumber. the inlets and outlets are all zero indexed

Note that a given inlet can not have more than 1 connection going into it. So ensure when connecting the nodes, that each inlet has exactly 1 connection coming into it.


The only output I need from the assistant is the DSL commands in a JSON list format. Each element of the list should be a string of the format specified earlier, no other formats allowed. No explanation text, just the list of commands. Remember only, operators in the API given are allowed, so do not ever create objects outside of that. Do not include any other explanation text

The API operators all act exactly the same as they do in Max MSP's gen~ language specification-- so remember that history works by getting its last input (one sample-frame ago) and sending it thru its outlet

API of allowed operators, in format (operator_name, description,inletName1, inletName2, ...)
phasor,outputs signal from 0-1 based on frequency,frequency,
reset
cycle,outputs a sine wave from -1 to 1 based on frequency in hz,frequency,phase
out,output of entire patcher,outputNumber
*,multiplies 2 numbers, number1, number2,
+,adds 2 numbers, number1,number2
wrap,wraps input ensuring it falls within range,input,min,max
delay,delays input by samples,input,delayTimeSamples
history,1 sample delay,input
sin,applies sine math operator to input,input
tanh,applies tanh to input,input
`
            }
        )
        console.log('assistants = ', this.assistant);
        console.log(this);
    */
  }
}

export default Assistant;

const sleep = (time: number): Promise<void> => {
  return new Promise((resolve: () => void) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
};
