export function downloadStringAsFile(filename: string, content: string): void {
  // Create a new Blob object using the content and specify the MIME type
  const blob = new Blob([content], { type: "text/plain" });

  // Create a link element
  const link = document.createElement("a");

  // Create a URL for the Blob and set it as the href attribute of the link
  link.href = URL.createObjectURL(blob);
  link.download = filename;

  // Append the link to the document body
  document.body.appendChild(link);

  // Programmatically click the link to trigger the download
  link.click();

  // Remove the link from the document body
  document.body.removeChild(link);
}
