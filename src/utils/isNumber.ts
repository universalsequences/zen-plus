export function isNumber(str: string): boolean {
  // Regular expression to match valid number formats
  const numberPattern = /^-?\d+(\.\d+)?$/;
  if (!numberPattern.test(str)) {
    return false;
  }

  // Parse the string to a number and check if it is finite
  const parsedNumber = parseFloat(str);
  return !isNaN(parsedNumber) && isFinite(parsedNumber);
}
