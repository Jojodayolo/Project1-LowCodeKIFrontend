/**
 * Validates whether a given string is a correctly formatted XML.
 * @param xmlString The XML text to validate.
 * @returns true if the XML is valid, otherwise false.
 */
export function isValidXml(xmlString: string): boolean {
  if (!xmlString || typeof xmlString !== "string") {
    return false;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    
    // Browsers inject a <parsererror> element into the document if parsing fails
    const hasParseError = doc.getElementsByTagName("parsererror").length > 0;
    
    return !hasParseError;
  } catch (error) {
    // Fail-safe in case the parser crashes in a specific environment
    return false;
  }
}