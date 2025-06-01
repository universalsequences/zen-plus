/**
 * Utility functions for parsing Claude assistant responses
 */

export interface ParsedResponse {
  intent: string;
  signalFlow: string;
  usageNotes: string;
  commands: string[];
  fullResponse: string;
}

/**
 * Extracts a section from a markdown response between markers
 */
export const extractSection = (response: string, startMarker: string, endMarker?: string): string => {
  const startIndex = response.indexOf(startMarker);
  if (startIndex === -1) return "";
  
  const contentStart = startIndex + startMarker.length;
  let endIndex = response.length;
  
  if (endMarker) {
    const foundEnd = response.indexOf(endMarker, contentStart);
    if (foundEnd !== -1) {
      endIndex = foundEnd;
    }
  } else {
    // Find next section header (starts with ** at beginning of line or after newline)
    const nextSection = response.indexOf("\n**", contentStart);
    if (nextSection !== -1) {
      endIndex = nextSection;
    }
  }
  
  const extracted = response.slice(contentStart, endIndex).trim();
  return extracted;
};

/**
 * Extracts commands from the **Patch Commands** section
 */
export const extractCommands = (response: string): string[] => {
  const commandsStart = response.indexOf("**Patch Commands**:");
  if (commandsStart !== -1) {
    const commandsSection = response.slice(commandsStart);
    
    // Find the code block within commands section
    const codeStart = commandsSection.indexOf("```");
    if (codeStart !== -1) {
      const codeEnd = commandsSection.indexOf("```", codeStart + 3);
      if (codeEnd !== -1) {
        const operations = commandsSection.slice(codeStart + 3, codeEnd).trim();
        
        // Split by lines and process commands
        return operations.split("\n")
          .map(line => line.trim())
          .filter(line => {
            // Only keep lines that start with numbers (actual commands)
            return line && /^\d+\.\s+/.test(line);
          })
          .map(line => {
            // Remove leading numbers (e.g., "1. create phasor..." -> "create phasor...")
            return line.replace(/^\d+\.\s*/, "");
          });
      }
    }
  }
  
  return [];
};

/**
 * Fallback: Extract commands from any code block containing numbered commands
 */
export const extractCommandsFromAnyCodeBlock = (response: string): string[] => {
  const codeBlocks = response.match(/```[\s\S]*?```/g);
  if (codeBlocks) {
    for (const block of codeBlocks) {
      const content = block.slice(3, -3).trim();
      const lines = content.split("\n")
        .map(line => line.trim())
        .filter(line => /^\d+\.\s+(create|param|connect)/.test(line))
        .map(line => line.replace(/^\d+\.\s*/, ""));
      
      if (lines.length > 0) {
        return lines;
      }
    }
  }
  
  return [];
};

/**
 * Legacy fallback: Parse JSON format or extract commands from lines
 */
export const extractCommandsLegacy = (response: string): string[] => {
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Not JSON, try line extraction
  }
  
  return response.split("\n")
    .map(line => line.trim())
    .filter(line => line && (line.includes("create") || line.includes("param") || line.includes("connect")))
    .map(line => line.replace(/^\d+\.\s*/, ""));
};

/**
 * Validates param commands for the new format: param destination_id.inlet_number value (x,y)
 */
export const validateParamCommands = (commands: string[]): string[] => {
  return commands.filter(command => {
    if (command.startsWith("param ")) {
      // Validate: param [destination_id].[inlet_number] [value] ([x_position],[y_position])
      const paramMatch = command.match(/^param\s+(\S+)\.(\d+)\s+(\S+)\s+\((\d+),(\d+)\)$/);
      if (!paramMatch) {
        console.warn("Invalid param command format:", command);
        return false;
      }
    }
    return true;
  });
};

/**
 * Main parser function that handles all response formats
 */
export const parseAssistantResponse = (response: string): ParsedResponse => {
  // Extract explanatory sections
  const intent = extractSection(response, "**Intent**:");
  const signalFlow = extractSection(response, "**Signal Flow**:");
  const usageNotes = extractSection(response, "**Usage Notes**:");
  
  // Extract commands with fallbacks
  let commands = extractCommands(response);
  
  if (commands.length === 0) {
    commands = extractCommandsFromAnyCodeBlock(response);
  }
  
  if (commands.length === 0) {
    commands = extractCommandsLegacy(response);
  }
  
  // Validate param commands for the new format
  commands = validateParamCommands(commands);
  
  return {
    intent,
    signalFlow,
    usageNotes,
    commands,
    fullResponse: response,
  };
};

/**
 * Strips numbers from command lines (e.g., "1. create phasor..." -> "create phasor...")
 */
export const stripCommandNumbers = (commands: string[]): string[] => {
  return commands.map(line => line.trim().replace(/^\d+\.\s*/, ""));
};