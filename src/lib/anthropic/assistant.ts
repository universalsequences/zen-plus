import Anthropic from "@anthropic-ai/sdk";
import { system } from "./prompt";

const anthropic = new Anthropic({
  // defaults to process.env["ANTHROPIC_API_KEY"]
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * Detects if a response appears to be truncated/incomplete
 */
const isResponseIncomplete = (response: string): boolean => {
  // Check for incomplete patterns (at end of string only)
  const incompletePatterns = [
    /\d+\.\s*(create|param|connect)\s*$/i, // Ends with incomplete command
    /```\s*$/, // Ends with incomplete code block
    /\d+\.\s*$/, // Ends with just a number
    /\s+(create|param|connect)\s+\S*$/i, // Ends mid-command
  ];

  for (const pattern of incompletePatterns) {
    if (pattern.test(response.trim())) {
      return true;
    }
  }

  // Check if response ends abruptly without proper closure
  const trimmed = response.trim();
  if (trimmed.includes("**Patch Commands**:")) {
    const codeBlocks = trimmed.match(/```/g);
    // If there's an odd number of ```, the last code block is unclosed
    if (codeBlocks && codeBlocks.length % 2 !== 0) {
      return true;
    }
    
    // If we have patch commands but the response seems to end abruptly
    const lastCodeBlock = trimmed.lastIndexOf("```");
    if (lastCodeBlock !== -1) {
      const afterLastBlock = trimmed.substring(lastCodeBlock + 3).trim();
      // If there's content after the last ``` that doesn't look like a proper section
      if (afterLastBlock.length > 0 && 
          !afterLastBlock.startsWith("**") && 
          !afterLastBlock.includes("**Usage Notes**:") &&
          !afterLastBlock.includes("Notes:") &&
          afterLastBlock.length < 100) { // Short trailing content might be incomplete
        return true;
      }
    }
  }

  return false;
};

/**
 * Requests continuation of a truncated response
 */
const getContinuation = async (conversation: Array<{ role: string; content: any[] }>): Promise<string> => {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    temperature: 0,
    system: system,
    messages: [
      ...conversation,
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please continue where you left off. Complete the remaining patch commands.",
          },
        ],
      },
    ],
  });

  const content = msg.content[0];
  return content ? (content as any).text : "";
};

export const prompt = async (text: string): Promise<string[]> => {
  console.log("my key=", process.env.NEXT_PUBLIC_ANTHROPIC_KEY);
  
  const conversation = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: text,
        },
      ],
    },
  ];

  let msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000, // Increased from 1000
    temperature: 0,
    system: system,
    messages: conversation,
  });

  console.log(msg);
  const content = msg.content[0];
  
  if (!content) {
    return [];
  }

  let fullResponse = (content as any).text as string;
  console.log("Initial response=", fullResponse);

  // Check if response was truncated and get continuations
  let maxContinuations = 3; // Prevent infinite loops
  let continuationCount = 0;

  while (isResponseIncomplete(fullResponse) && continuationCount < maxContinuations) {
    console.log(`Response appears incomplete, requesting continuation ${continuationCount + 1}...`);
    
    // Add the assistant's response to conversation history
    conversation.push({
      role: "assistant",
      content: [
        {
          type: "text",
          text: fullResponse,
        },
      ],
    });

    const continuation = await getContinuation(conversation);
    console.log("Continuation=", continuation);
    
    if (continuation.trim().length === 0) {
      console.log("Empty continuation received, stopping");
      break;
    }

    fullResponse += "\n" + continuation;
    continuationCount++;

    // Update conversation history with the continuation
    conversation[conversation.length - 1].content[0].text = fullResponse;
  }

  if (continuationCount > 0) {
    console.log(`Completed response after ${continuationCount} continuation(s)`);
  }

  console.log("Final full response=", fullResponse);
  return [fullResponse];
};
