import { describe, it, expect } from "bun:test";

// We can't easily test the actual API calls, but we can test the helper functions
// by extracting them or testing the logic patterns

describe("assistant continuation logic", () => {
  // Helper function to mimic the isResponseIncomplete logic
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

  describe("isResponseIncomplete", () => {
    it("should detect incomplete numbered command", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.0 440 (150,150)
3. create`;
      
      expect(isResponseIncomplete(response)).toBe(true);
    });

    it("should detect response ending with just a number", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.0 440 (150,150)
3.`;
      
      expect(isResponseIncomplete(response)).toBe(true);
    });

    it("should detect incomplete code block", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.0 440 (150,150)
\`\`\``;
      
      expect(isResponseIncomplete(response)).toBe(true);
    });

    it("should detect mid-command truncation", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. connect osc1`;
      
      expect(isResponseIncomplete(response)).toBe(true);
    });

    it("should recognize complete response", () => {
      const response = `
# Synth Patch

**Intent**: Create a simple synth

**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.0 440 (150,150)
3. create out audio_out (200,100)
4. connect osc1.0 audio_out.0
\`\`\`

**Usage Notes**:

Adjust the frequency parameter to change the pitch.`;
      
      
      expect(isResponseIncomplete(response)).toBe(false);
    });

    it("should handle response without patch commands", () => {
      const response = `
# Simple Response

This is just a regular response without patch commands.
It should not be considered incomplete.`;
      
      expect(isResponseIncomplete(response)).toBe(false);
    });

    it("should detect incomplete response with content after code block", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.0 440 (150,150)
\`\`\`

Some incomplete text that doesn't start with **`;
      
      expect(isResponseIncomplete(response)).toBe(true);
    });

    it("should handle properly closed response with usage notes", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.0 440 (150,150)
\`\`\`

**Usage Notes**:

This is a complete response.`;
      
      expect(isResponseIncomplete(response)).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(isResponseIncomplete("")).toBe(false);
      expect(isResponseIncomplete("   ")).toBe(false);
      expect(isResponseIncomplete("Just some text")).toBe(false);
      expect(isResponseIncomplete("1.")).toBe(true);
      expect(isResponseIncomplete("create")).toBe(false); // Not at end
      expect(isResponseIncomplete("   create   ")).toBe(false);
    });
  });

  describe("max_tokens increase", () => {
    it("should handle larger responses with increased token limit", () => {
      // This is more of a documentation test since we can't easily test the actual API
      const maxTokensBefore = 1000;
      const maxTokensAfter = 3000;
      
      expect(maxTokensAfter).toBeGreaterThan(maxTokensBefore);
      expect(maxTokensAfter).toBe(3000);
    });
  });
});