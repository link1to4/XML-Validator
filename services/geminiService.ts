import { ValidationResult } from "../types";

// Helper to tokenize and parse DTD
interface DtdDefinition {
  type: 'EMPTY' | 'ANY' | 'PCDATA' | 'MIXED' | 'CHILDREN';
  allowedElements?: Set<string>; // For MIXED
  regex?: RegExp; // For CHILDREN
  rawSpec: string;
  line: number; // Line number in DTD file
}

// Utility to find line number from character index using pre-calculated offsets
// offsets array contains the starting index of each line
const getLineNumber = (index: number, lineOffsets: number[]): number => {
  // Binary search for efficiency
  let low = 0;
  let high = lineOffsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineOffsets[mid] === index) {
      return mid + 1;
    } else if (lineOffsets[mid] < index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  // If we don't find exact match, 'high' is the index of the line start 
  // that is closest to but less than 'index'
  return high + 1;
};

// Calculate starting indices for all lines in normalized text (\n only)
const calculateLineOffsets = (text: string): number[] => {
  const offsets = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
};

const parseDtd = (dtd: string): Map<string, DtdDefinition> => {
  const definitions = new Map<string, DtdDefinition>();
  const lineOffsets = calculateLineOffsets(dtd);
  
  // Regex to capture <!ELEMENT Name ContentSpec>
  // Handles multiline loosely by using [^>]+
  const elementRegex = /<!ELEMENT\s+([\w\-:.]+)\s+([^>]+)>/g;
  let match;

  while ((match = elementRegex.exec(dtd)) !== null) {
    const tagName = match[1];
    let spec = match[2].trim();
    
    // Calculate line number using match index and offsets
    const line = getLineNumber(match.index, lineOffsets);

    // Remove comments within the spec if any (simple handling)
    spec = spec.replace(/--.*?--/g, '');

    // Normalize spec for type checking by removing ALL whitespace
    // This fixes issues where '(#PCDATA)' is written as '( \n #PCDATA \n )'
    const cleanSpec = spec.replace(/\s+/g, '');

    const def: DtdDefinition = {
      type: 'CHILDREN',
      rawSpec: spec,
      line: line
    };

    if (cleanSpec === 'EMPTY') {
      def.type = 'EMPTY';
    } else if (cleanSpec === 'ANY') {
      def.type = 'ANY';
    } else if (cleanSpec === '(#PCDATA)') {
      def.type = 'PCDATA';
    } else if (cleanSpec.startsWith('(#PCDATA')) {
      // Mixed content: (#PCDATA|a|b)*
      def.type = 'MIXED';
      // Extract allowed element names from cleanSpec
      // Remove (#PCDATA and )* and split by |
      const content = cleanSpec.replace(/^\(#PCDATA\|/, '').replace(/\)\*?$/, '');
      const parts = content.split('|');
      def.allowedElements = new Set(parts);
    } else {
      // Element content: (a,b,(c|d)+)
      def.type = 'CHILDREN';
      try {
        def.regex = convertSpecToRegex(spec); // pass original spec (convertSpecToRegex handles whitespace)
      } catch (e) {
        console.warn(`Failed to parse content spec for ${tagName}:`, spec, e);
        // Fallback to basic ANY-like behavior if parsing fails, but log it
        def.type = 'ANY'; 
      }
    }

    definitions.set(tagName, def);
  }

  return definitions;
};

// Convert DTD content spec to JS RegExp
const convertSpecToRegex = (spec: string): RegExp => {
  // 1. Remove all whitespace
  let s = spec.replace(/\s+/g, '');

  // 2. Tokenize based on DTD delimiters: ( ) , | * + ?
  const tokens = s.split(/([(),|*+?])/);

  let regexStr = "^";

  for (let t of tokens) {
    if (!t) continue;
    
    if (['(', ')', '|', '*', '+', '?', ','].includes(t)) {
      if (t === '(') regexStr += '(?:'; // Non-capturing group start
      else if (t === ')') regexStr += ')'; // Group end
      else if (t === ',') regexStr += ''; // Sequence in DTD is concatenation in Regex
      else regexStr += t; // | * + ? map directly to Regex operators
    } else {
      // It's an element name
      const escapedName = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Prefix with control char \x01 to strictly delimit tokens
      regexStr += `(?:\\x01${escapedName})`;
    }
  }

  regexStr += "$";
  return new RegExp(regexStr);
};

// Helper to map DOM elements to line numbers
const mapElementLines = (xmlStr: string, root: Element): Map<Element, number> => {
  const lineMap = new Map<Element, number>();
  const lineOffsets = calculateLineOffsets(xmlStr);
  
  // Mask Comments and CDATA to avoid false positives in regex
  // Replace content with spaces to preserve indices/line counts
  let maskedXml = xmlStr.replace(/<!--[\s\S]*?-->/g, (match) => ' '.repeat(match.length));
  maskedXml = maskedXml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (match) => ' '.repeat(match.length));

  // Find all start tags in order
  const tagRegex = /<([a-zA-Z0-9_\-.:]+)[^>]*>/g;
  let match;
  const tagLocations: { tagName: string, index: number, line: number }[] = [];
  
  while ((match = tagRegex.exec(maskedXml)) !== null) {
    const tagName = match[1];
    const index = match.index;
    const line = getLineNumber(index, lineOffsets);
    tagLocations.push({ tagName, index, line });
  }

  // Traverse DOM and match
  let matchIndex = 0;
  
  const traverse = (node: Element) => {
    const targetTag = node.tagName;
    
    let tempIndex = matchIndex;
    while (tempIndex < tagLocations.length) {
        if (tagLocations[tempIndex].tagName === targetTag) {
            lineMap.set(node, tagLocations[tempIndex].line);
            matchIndex = tempIndex + 1;
            break;
        }
        tempIndex++;
    }

    for (const child of Array.from(node.children)) {
        traverse(child);
    }
  };

  traverse(root);
  return lineMap;
};

const validateNode = (
  node: Element, 
  definitions: Map<string, DtdDefinition>,
  lineMap: Map<Element, number>
): string[] => {
  const errors: string[] = [];
  const tagName = node.tagName;
  const def = definitions.get(tagName);
  
  const xmlLine = lineMap.get(node) || '?';
  const dtdLine = def ? def.line : null;
  
  let prefix = `[XML: ${xmlLine}]`;
  if (dtdLine) {
    prefix += ` [DTD: ${dtdLine}]`;
  }

  if (!def) {
    return [`${prefix} Element <${tagName}> is used in XML but not defined in DTD.`];
  }

  const childElements = node.children 
    ? Array.from(node.children) 
    : Array.from(node.childNodes).filter(n => n.nodeType === 1) as Element[];

  const textContent = Array.from(node.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent || '')
    .join('');
  
  const hasNonWhitespaceText = textContent.trim().length > 0;

  switch (def.type) {
    case 'EMPTY':
      if (childElements.length > 0 || hasNonWhitespaceText) {
        errors.push(`${prefix} Element <${tagName}> is declared EMPTY but contains content.`);
      }
      break;

    case 'PCDATA':
      if (childElements.length > 0) {
        errors.push(`${prefix} Element <${tagName}> is declared (#PCDATA) but contains child elements.`);
      }
      break;

    case 'MIXED':
      for (const child of childElements) {
        if (!def.allowedElements?.has(child.tagName)) {
          errors.push(`${prefix} Element <${tagName}> contains unexpected child <${child.tagName}>. Allowed mixed content: ${Array.from(def.allowedElements || []).join(', ')}.`);
        }
      }
      break;

    case 'CHILDREN':
      if (hasNonWhitespaceText) {
        errors.push(`${prefix} Element <${tagName}> has element-only content definition but contains text data: "${textContent.trim().substring(0, 20)}..."`);
      }

      const childSignature = childElements.map(c => `\x01${c.tagName}`).join('');
      
      if (def.regex && !def.regex.test(childSignature)) {
        const currentChildren = childElements.length > 0 
          ? childElements.map(c => c.tagName).join(', ')
          : 'None';
        const cleanSpec = def.rawSpec.replace(/\s+/g, ' ');
        errors.push(`${prefix} Element <${tagName}> has invalid content structure.\nFound children: [${currentChildren}]\nExpected DTD sequence: ${cleanSpec}`);
      }
      break;

    case 'ANY':
    default:
      break;
  }

  for (const child of childElements) {
    errors.push(...validateNode(child, definitions, lineMap));
  }

  return errors;
};

export const validateXmlWithDtd = async (dtd: string, xml: string): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    // Normalize line endings to \n to ensure consistent line counting
    // This fixes issues with CRLF vs LF causing line number drift
    const normalizedDtd = dtd.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const normalizedXml = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    setTimeout(() => {
      try {
        const errors: string[] = [];

        // 1. Parse DTD (using normalized string)
        const definitions = parseDtd(normalizedDtd);
        if (definitions.size === 0) {
           resolve({
            isValid: false,
            errors: ["No valid ELEMENT definitions found in DTD."],
            generalComment: "DTD parsing failed or input was empty.",
            timestamp: Date.now(),
          });
          return;
        }

        // 2. Parse XML (using normalized string for parsing and mapping)
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(normalizedXml, "text/xml");
        const parserErrors = xmlDoc.getElementsByTagName("parsererror");

        if (parserErrors.length > 0) {
           resolve({
            isValid: false,
            errors: [`XML Syntax Error: ${parserErrors[0].textContent}`],
            generalComment: "The XML document is not well-formed.",
            timestamp: Date.now(),
          });
          return;
        }

        // 3. Validate
        const root = xmlDoc.documentElement;
        if (root) {
            // Map lines based on normalized string
            const lineMap = mapElementLines(normalizedXml, root);
            errors.push(...validateNode(root, definitions, lineMap));
        } else {
            errors.push("XML document has no root element.");
        }

        const isValid = errors.length === 0;

        resolve({
          isValid,
          errors,
          generalComment: isValid 
            ? "Validation Successful. The XML strictly adheres to the DTD structure." 
            : `Validation Failed. Found ${errors.length} structural error(s).`,
          timestamp: Date.now(),
        });

      } catch (err: any) {
        console.error("Validation logic error:", err);
        resolve({
          isValid: false,
          errors: [`Internal Validator Error: ${err.message}`],
          generalComment: "An unexpected error occurred during validation.",
          timestamp: Date.now(),
        });
      }
    }, 400);
  });
};