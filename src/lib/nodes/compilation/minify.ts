import { replaceAll } from "@/lib/zen/replaceAll";
import { Statement } from "../definitions/zen/types";
import { printStatement } from "../definitions/zen/AST";

export const printAndMinify = (statement: Statement): string => {
  let inputFile = printStatement(statement);
  inputFile = inputFile.replace(/zswitch(\d+)/g, (_, number) => `z${number}`);
  inputFile = inputFile.replace(/add(\d+)/g, (_, number) => `a${number}`);
  inputFile = inputFile.replace(/sub(\d+)/g, (_, number) => `q${number}`);
  inputFile = inputFile.replace(/mult(\d+)/g, (_, number) => `m${number}`);
  inputFile = inputFile.replace(/div(\d+)/g, (_, number) => `d${number}`);
  inputFile = inputFile.replace(/history(\d+)/g, (_, number) => `hst${number}`);
  inputFile = inputFile.replace(/rampToTrig(\d+)/g, (_, number) => `r${number}`);
  inputFile = inputFile.replace(/phasor(\d+)/g, (_, number) => `p${number}`);
  inputFile = inputFile.replace(/cycle(\d+)/g, (_, number) => `c${number}`);
  inputFile = inputFile.replace(/floor(\d+)/g, (_, number) => `f${number}`);
  inputFile = inputFile.replace(/and(\d+)/g, (_, number) => `an${number}`);
  inputFile = inputFile.replace(/accum(\d+)/g, (_, number) => `ac${number}`);
  inputFile = inputFile.replace(/mod(\d+)/g, (_, number) => `mo${number}`);
  inputFile = inputFile.replace(/clamp(\d+)/g, (_, number) => `cl${number}`);
  inputFile = inputFile.replace(/eq(\d+)/g, (_, number) => `E${number}`);
  inputFile = inputFile.replace(/selector(\d+)/g, (_, number) => `S${number}`);
  inputFile = inputFile.replace(/triangle(\d+)/g, (_, number) => `T${number}`);
  inputFile = inputFile.replace(/mstosamps(\d+)/g, (_, number) => `ms${number}`);
  inputFile = inputFile.replace(/round(\d+)/g, (_, number) => `ro${number}`);
  inputFile = inputFile.replace(/compressor(\d+)/g, (_, number) => `co${number}`);
  inputFile = inputFile.replace(/wrap(\d+)/g, (_, number) => `w${number}`);
  inputFile = inputFile.replace(/argument(\d+)/g, (_, number) => `A${number}`);
  inputFile = inputFile.replace(/onepole(\d+)/g, (_, number) => `o${number}`);
  inputFile = inputFile.replace(/scale(\d+)/g, (_, number) => `sc${number}`);
  inputFile = inputFile.replace(/vactrol(\d+)/g, (_, number) => `V${number}`);
  inputFile = inputFile.replace(/param(\d+)/g, "p$1");
  inputFile = inputFile.replace(/latch(\d+)/g, "L$1");
  inputFile = inputFile.replace(/mix(\d+)/g, "M$1");
  inputFile = inputFile.replace(/delay(\d+)/g, "D$1");
  inputFile = inputFile.replace(/biquad(\d+)/g, "B$1");
  inputFile = replaceAll(inputFile, "  ", "");
  inputFile = replaceAll(inputFile, "(\n", "(");
  inputFile = replaceAll(inputFile, "( ", "(");
  inputFile = replaceAll(inputFile, ",\n", ",");
  inputFile = replaceAll(inputFile, " (", "(");
  inputFile = replaceAll(inputFile, " )", ")");
  inputFile = replaceAll(inputFile, ") ", ")");
  inputFile = replaceAll(inputFile, " = ", "=");
  inputFile = getFunctionNames(inputFile);
  inputFile = replaceAll(inputFile, ", ", ",");
  inputFile = replaceAll(inputFile, " ,", ",");

  return inputFile;
};

export const minify = (inputFile: string, ultraMinify = true): string => {
  inputFile = inputFile.replace(/zswitch(\d+)/g, (_, number) => `z${number}`);
  inputFile = inputFile.replace(/add(\d+)/g, (_, number) => `a${number}`);
  inputFile = inputFile.replace(/sub(\d+)/g, (_, number) => `q${number}`);
  inputFile = inputFile.replace(/mult(\d+)/g, (_, number) => `m${number}`);
  inputFile = inputFile.replace(/div(\d+)/g, (_, number) => `d${number}`);
  //inputFile = inputFile.replace(/history(\d+)/g, (_, number) => `h${number}`);
  inputFile = inputFile.replace(/rampToTrig(\d+)/g, (_, number) => `r${number}`);
  inputFile = inputFile.replace(/phasor(\d+)/g, (_, number) => `p${number}`);
  inputFile = inputFile.replace(/cycle(\d+)/g, (_, number) => `c${number}`);
  inputFile = inputFile.replace(/floor(\d+)/g, (_, number) => `f${number}`);
  inputFile = inputFile.replace(/and(\d+)/g, (_, number) => `an${number}`);
  inputFile = inputFile.replace(/accum(\d+)/g, (_, number) => `ac${number}`);
  inputFile = inputFile.replace(/mod(\d+)/g, (_, number) => `mo${number}`);
  inputFile = inputFile.replace(/clamp(\d+)/g, (_, number) => `cl${number}`);
  inputFile = inputFile.replace(/eq(\d+)/g, (_, number) => `E${number}`);
  inputFile = inputFile.replace(/selector(\d+)/g, (_, number) => `S${number}`);
  inputFile = inputFile.replace(/triangle(\d+)/g, (_, number) => `T${number}`);
  inputFile = inputFile.replace(/mstosamps(\d+)/g, (_, number) => `ms${number}`);
  inputFile = inputFile.replace(/round(\d+)/g, (_, number) => `ro${number}`);
  inputFile = inputFile.replace(/compressor(\d+)/g, (_, number) => `co${number}`);
  inputFile = inputFile.replace(/wrap(\d+)/g, (_, number) => `w${number}`);
  inputFile = inputFile.replace(/argument(\d+)/g, (_, number) => `A${number}`);
  inputFile = inputFile.replace(/onepole(\d+)/g, (_, number) => `o${number}`);
  inputFile = inputFile.replace(/scale(\d+)/g, (_, number) => `sc${number}`);
  inputFile = inputFile.replace(/vactrol(\d+)/g, (_, number) => `V${number}`);
  inputFile = replaceAll(inputFile, " ,", ",");
  inputFile = inputFile.replace(/param(\d+)/g, "p$1");
  inputFile = inputFile.replace(/latch(\d+)/g, "L$1");
  inputFile = inputFile.replace(/mix(\d+)/g, "M$1");
  inputFile = inputFile.replace(/delay(\d+)/g, "D$1");
  inputFile = inputFile.replace(/biquad(\d+)/g, "B$1");
  inputFile = replaceAll(inputFile, "  ", "");
  inputFile = replaceAll(inputFile, "(\n", "(");
  inputFile = replaceAll(inputFile, "( ", "(");
  inputFile = replaceAll(inputFile, ",\n", ",");
  inputFile = replaceAll(inputFile, " (", "(");
  inputFile = replaceAll(inputFile, " )", ")");
  inputFile = replaceAll(inputFile, ") ", ")");
  inputFile = replaceAll(inputFile, " = ", "=");

  inputFile = getFunctionNames(inputFile, ultraMinify);

  return inputFile;
};

const getFunctionNames = (dslCode: string, ultraMinify = true) => {
  const funcRegex = /\b(\w+\.)?(\w+)\(/g;

  // Object to store unique function names
  const functions: any = {};

  // Find all matches
  let match;
  while ((match = funcRegex.exec(dslCode)) !== null) {
    if (match[1] && match[2]) {
      functions[match[1] + match[2]] = true; // Store the function name
    } else {
      if (ultraMinify) {
        functions[match[2]] = true; // Store the function name
      }
    }
  }

  const shorthands: any = {};
  // Generate shorthands
  /*
		let shorthandIndex = 0;

		let currentCharCode = 97; // ASCII code for 'a'
		let extraChar = -1;
		const alphabet = 'abcdefghijklmnopqrstuvwxyz';
		let currentCharIndex = 0;
		let prefixIndex = -1;
		*/

  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let prefixIndex = 0;
  let suffixIndex = 0;

  Object.keys(functions).forEach((func) => {
    // Generate a shorthand name, e.g., f1, f2, ...
    /*
				shorthands[func] = 'F' + shorthandIndex++;
				*/
    let shorthand = alphabet[prefixIndex] + (suffixIndex > 0 ? alphabet[suffixIndex - 1] : "");

    if (shorthand === "do") {
      shorthand = "d000";
    }

    if (shorthand === "eq") {
      shorthand = "eq000";
    }

    shorthands[func] = shorthand;

    if (suffixIndex === alphabet.length) {
      suffixIndex = 0;
      prefixIndex++;
    } else {
      suffixIndex++;
    }
  });

  // Generate the shorthand definitions
  let shorthandDefinitions = "let ";
  let outDSL = dslCode;

  ultraMinify = true;
  if (ultraMinify) {
    Object.entries(shorthands).forEach(([original, shorthand], i) => {
      if (
        original.includes("connections") ||
        original.includes("bidirectional") ||
        original.includes("gen")
      ) {
        return;
      }
      if (!original.includes("hst") || original === "history") {
        shorthandDefinitions += `${shorthand}=${original}`;
        if (i < Object.values(shorthands).length - 1) {
          shorthandDefinitions += ",";
        }
        if (original === "history") {
        }
        outDSL = outDSL.replaceAll("= " + original + "(", "=" + shorthand + "(");
        outDSL = outDSL.replaceAll("=" + original + "(", "=" + shorthand + "(");
      }
    });
    shorthandDefinitions = replaceAll(shorthandDefinitions, "\n", "");
  }

  if (!ultraMinify) {
    shorthandDefinitions = "";
  }
  outDSL =
    shorthandDefinitions +
    ";\n" +
    "let " +
    outDSL.replaceAll("let ", ",").replaceAll(";", "").replaceAll("\n", "").slice(1);
  let retIndex = outDSL.indexOf("return");
  outDSL = outDSL.slice(0, retIndex) + ";\n" + outDSL.slice(retIndex);

  return outDSL;
};
