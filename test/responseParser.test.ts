import { describe, it, expect } from "bun:test";
import {
  extractSection,
  extractCommands,
  extractCommandsFromAnyCodeBlock,
  extractCommandsLegacy,
  parseAssistantResponse,
  stripCommandNumbers,
  validateParamCommands,
} from "../src/lib/assistant/responseParser";

describe("responseParser", () => {
  describe("extractSection", () => {
    it("should extract content between markdown headers", () => {
      const response = `
**Intent**: Create a minimal synth
Some description here.

**Signal Flow**: 
Flow description

**Usage Notes**:
Notes here
`;
      
      const intent = extractSection(response, "**Intent**:");
      const signalFlow = extractSection(response, "**Signal Flow**:");
      const usageNotes = extractSection(response, "**Usage Notes**:");
      
      expect(intent).toBe("Create a minimal synth\nSome description here.");
      expect(signalFlow).toBe("Flow description");
      expect(usageNotes).toBe("Notes here");
    });

    it("should return empty string if section not found", () => {
      const response = "No sections here";
      const result = extractSection(response, "**Intent**:");
      expect(result).toBe("");
    });

    it("should handle sections at the end of response", () => {
      const response = `
**Intent**: Last section content
`;
      const result = extractSection(response, "**Intent**:");
      expect(result).toBe("Last section content");
    });
  });

  describe("extractCommands", () => {
    it("should extract numbered commands from Patch Commands section", () => {
      const response = `
# Alva Noto Inspired Synth Patch

**Intent**: Create a minimal, glitchy synth

**Patch Commands**:

\`\`\`
1. create phasor pulse_clock (100,100)
2. create gt pulse_gate (250,100)
3. param pulse_clock.frequency 8 (150,150)
4. connect pulse_clock.0 pulse_gate.0
\`\`\`

**Usage Notes**:
Some usage notes
`;

      const commands = extractCommands(response);
      expect(commands).toEqual([
        "create phasor pulse_clock (100,100)",
        "create gt pulse_gate (250,100)",
        "param pulse_clock.frequency 8 (150,150)",
        "connect pulse_clock.0 pulse_gate.0"
      ]);
    });

    it("should return empty array if no Patch Commands section", () => {
      const response = "No patch commands here";
      const commands = extractCommands(response);
      expect(commands).toEqual([]);
    });

    it("should return empty array if no code block in Patch Commands", () => {
      const response = `
**Patch Commands**:
No code block here
`;
      const commands = extractCommands(response);
      expect(commands).toEqual([]);
    });

    it("should filter out non-numbered lines in code block", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
// This is a comment
2. create cycle carrier (200,100)
Some other text
3. param osc1.frequency 440 (150,150)
\`\`\`
`;

      const commands = extractCommands(response);
      expect(commands).toEqual([
        "create phasor osc1 (100,100)",
        "create cycle carrier (200,100)",
        "param osc1.frequency 440 (150,150)"
      ]);
    });
  });

  describe("extractCommandsFromAnyCodeBlock", () => {
    it("should extract commands from any code block with numbered commands", () => {
      const response = `
Some explanation text

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.frequency 440 (150,150)
3. connect osc1.0 out1.0
\`\`\`

More text
`;

      const commands = extractCommandsFromAnyCodeBlock(response);
      expect(commands).toEqual([
        "create phasor osc1 (100,100)",
        "param osc1.frequency 440 (150,150)",
        "connect osc1.0 out1.0"
      ]);
    });

    it("should skip code blocks without valid commands", () => {
      const response = `
\`\`\`json
["some", "json", "array"]
\`\`\`

\`\`\`
Some random text
Without numbered commands
\`\`\`

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.frequency 440 (150,150)
\`\`\`
`;

      const commands = extractCommandsFromAnyCodeBlock(response);
      expect(commands).toEqual([
        "create phasor osc1 (100,100)",
        "param osc1.frequency 440 (150,150)"
      ]);
    });

    it("should return empty array if no valid code blocks", () => {
      const response = "No code blocks here";
      const commands = extractCommandsFromAnyCodeBlock(response);
      expect(commands).toEqual([]);
    });
  });

  describe("extractCommandsLegacy", () => {
    it("should parse JSON array format", () => {
      const response = '["create phasor osc1 100 100", "param osc1.frequency 440", "connect osc1.0 out1.0"]';
      const commands = extractCommandsLegacy(response);
      expect(commands).toEqual([
        "create phasor osc1 100 100",
        "param osc1.frequency 440",
        "connect osc1.0 out1.0"
      ]);
    });

    it("should extract commands from plain text lines", () => {
      const response = `
Some intro text
1. create phasor osc1 (100,100)
Random text here
2. param osc1.frequency 440 (150,150)
More random text
3. connect osc1.0 out1.0
`;

      const commands = extractCommandsLegacy(response);
      expect(commands).toEqual([
        "create phasor osc1 (100,100)",
        "param osc1.frequency 440 (150,150)",
        "connect osc1.0 out1.0"
      ]);
    });

    it("should handle malformed JSON gracefully", () => {
      const response = `
{malformed json
create phasor osc1 (100,100)
param osc1.frequency 440
`;

      const commands = extractCommandsLegacy(response);
      expect(commands).toEqual([
        "create phasor osc1 (100,100)",
        "param osc1.frequency 440"
      ]);
    });
  });

  describe("parseAssistantResponse", () => {
    it("should parse complete response with all sections", () => {
      const response = `
# Alva Noto Inspired Synth Patch

**Intent**: Create a minimal, glitchy synth inspired by Alva Noto's aesthetic - featuring precise digital tones, rhythmic pulse modulation, and subtle noise textures with mathematical precision.

**Signal Flow**:
\`\`\`
[Pulse LFO] → [Sample & Hold] → [Quantizer] → [Sine Carrier]
     ↓              ↓                           ↓
[Noise] → [Gate] → [Clicks] → [Mix] ← [Filtered Carrier]
                                ↓
                           [Bit Reduction] → [Output]
\`\`\`

**Patch Commands**:

\`\`\`
1. create phasor pulse_clock (100,100)
2. create gt pulse_gate (250,100)
3. create noise random_source (100,200)
4. param pulse_gate.1 0.5 (300,150)
5. connect pulse_clock.0 pulse_gate.0
6. connect pulse_gate.0 random_source.1
\`\`\`

**Usage Notes**:

Core Parameters:
- \`pulse_clock.frequency\` (2-16 Hz): Controls the rhythmic pulse rate - try 4, 8, or 12 for different feels
- \`base_pitch.1\` (110-880 Hz): Base frequency - 220Hz is a good starting point
`;

      const parsed = parseAssistantResponse(response);
      expect(parsed.intent).toBe("Create a minimal, glitchy synth inspired by Alva Noto's aesthetic - featuring precise digital tones, rhythmic pulse modulation, and subtle noise textures with mathematical precision.");
      
      expect(parsed.signalFlow).toContain("[Pulse LFO] → [Sample & Hold]");
      
      expect(parsed.usageNotes).toContain("Core Parameters:");
      expect(parsed.usageNotes).toContain("pulse_clock.frequency");
      
      expect(parsed.commands).toEqual([
        "create phasor pulse_clock (100,100)",
        "create gt pulse_gate (250,100)",
        "create noise random_source (100,200)",
        "param pulse_gate.1 0.5 (300,150)", // Valid - destination_id.inlet_number format
        "connect pulse_clock.0 pulse_gate.0",
        "connect pulse_gate.0 random_source.1"
      ]);
      
      expect(parsed.fullResponse).toBe(response);
    });

    it("should handle missing sections gracefully", () => {
      const response = `
**Patch Commands**:

\`\`\`
1. create phasor osc1 (100,100)
2. param osc1.0 440 (150,150)
\`\`\`
`;

      const parsed = parseAssistantResponse(response);
      
      expect(parsed.intent).toBe("");
      expect(parsed.signalFlow).toBe("");
      expect(parsed.usageNotes).toBe("");
      expect(parsed.commands).toEqual([
        "create phasor osc1 (100,100)",
        "param osc1.0 440 (150,150)" // Valid format: destination_id.inlet_number
      ]);
    });

    it("should fallback to legacy parsing for old format", () => {
      const response = '["create phasor osc1 100 100", "param osc1.0 440 (50,50)"]';
      const parsed = parseAssistantResponse(response);
      
      expect(parsed.intent).toBe("");
      expect(parsed.signalFlow).toBe("");
      expect(parsed.usageNotes).toBe("");
      expect(parsed.commands).toEqual([
        "create phasor osc1 100 100",
        "param osc1.0 440 (50,50)" // Valid format for new param commands
      ]);
    });
  });

  describe("validateParamCommands", () => {
    it("should validate correct param command format", () => {
      const commands = [
        "param osc1.0 440 (150,150)", // Valid: destination_id.inlet_number value (x,y)
        "param mixer.1 0.5 (200,200)", // Valid
        "param filter.2 1000 (300,300)", // Valid
        "create phasor osc1 (100,100)", // Not a param command - should pass through
        "connect osc1.0 mixer.0" // Not a param command - should pass through
      ];

      const validated = validateParamCommands(commands);
      expect(validated).toEqual([
        "param osc1.0 440 (150,150)",
        "param mixer.1 0.5 (200,200)",
        "param filter.2 1000 (300,300)",
        "create phasor osc1 (100,100)",
        "connect osc1.0 mixer.0"
      ]);
    });

    it("should filter out invalid param command formats", () => {
      const commands = [
        "param osc1.0 440 (150,150)", // Valid
        "param osc1.frequency 440 (150,150)", // Invalid - non-numeric inlet
        "param mixer 0.5 (200,200)", // Invalid - missing inlet number
        "param filter.2.extra 1000 (300,300)", // Invalid - too many dots
        "param incomplete", // Invalid - malformed
        "param node. 300 (50,100)", // Invalid - empty inlet number
        "param node.1a 200 (50,75)", // Invalid - alphanumeric inlet
        "create phasor osc1 (100,100)" // Valid non-param command
      ];

      // Mock console.warn to avoid test output noise
      const originalWarn = console.warn;
      console.warn = () => {};

      const validated = validateParamCommands(commands);
      
      // Restore console.warn
      console.warn = originalWarn;

      expect(validated).toEqual([
        "param osc1.0 440 (150,150)", // Only valid param command
        "create phasor osc1 (100,100)" // Non-param commands pass through
      ]);
    });

    it("should handle edge cases", () => {
      const commands = [
        "param node.0 100 (50,50)", // Valid - inlet 0
        "param node.99 200 (50,75)", // Valid - large inlet number
        "param node.1 -300 (50,100)", // Valid - negative value
        "param node.2 0.5 (50,125)", // Valid - decimal value
        "" // Empty command - should pass through
      ];

      const validated = validateParamCommands(commands);
      expect(validated).toEqual([
        "param node.0 100 (50,50)",
        "param node.99 200 (50,75)",
        "param node.1 -300 (50,100)",
        "param node.2 0.5 (50,125)",
        ""
      ]);
    });

    it("should handle empty array", () => {
      const validated = validateParamCommands([]);
      expect(validated).toEqual([]);
    });
  });

  describe("stripCommandNumbers", () => {
    it("should remove leading numbers from command lines", () => {
      const commands = [
        "1. create phasor osc1 (100,100)",
        "2. param osc1.frequency 440 (150,150)",
        "3. connect osc1.0 out1.0",
        "create cycle carrier (200,100)" // no number
      ];

      const stripped = stripCommandNumbers(commands);
      expect(stripped).toEqual([
        "create phasor osc1 (100,100)",
        "param osc1.frequency 440 (150,150)",
        "connect osc1.0 out1.0",
        "create cycle carrier (200,100)"
      ]);
    });

    it("should handle various number formats", () => {
      const commands = [
        "1. create phasor osc1 (100,100)",
        "10. param osc1.frequency 440",
        "123.   connect osc1.0 out1.0",
        "  45. create cycle carrier (200,100)"
      ];

      const stripped = stripCommandNumbers(commands);
      expect(stripped).toEqual([
        "create phasor osc1 (100,100)",
        "param osc1.frequency 440",
        "connect osc1.0 out1.0",
        "create cycle carrier (200,100)"
      ]);
    });

    it("should handle empty array", () => {
      const stripped = stripCommandNumbers([]);
      expect(stripped).toEqual([]);
    });
  });
});