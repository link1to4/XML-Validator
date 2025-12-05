import { ValidationResult } from "../types";

// Helper to tokenize and parse DTD
interface DtdDefinition {
  type: 'EMPTY' | 'ANY' | 'PCDATA' | 'MIXED' | 'CHILDREN';
  allowedElements?: Set<string>; // For MIXED
  regex?: RegExp; // For CHILDREN
  rawSpec: string;
  line: number; // Line number in DTD file
}

const parseDtd = (dtd: string): Map<string, DtdDefinition> => {
  const definitions = new Map<string, DtdDefinition>();
  
  // Regex to capture <!ELEMENT Name ContentSpec>
  // Handles multiline loosely by using [^>]+
  const elementRegex = /<!ELEMENT\s+([\w\-:.]+)\s+([^>]+)>/g;
  let match;

  while ((match = elementRegex.exec(dtd)) !== null) {
    const tagName = match[1];
    let spec = match[2].trim();
    
    // Calculate line number for this definition
    // Count newlines from start of string up to the match index + 1 (to be 1-based)
    const line = dtd.substring(0, match.index).split(/\r\n|\r|\n/).length;

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
// Strategy: Use a control character \x01 as a prefix for every element token.
// DTD: (a, b+|c)
// Regex: ^(?:\x01a)(?:\x01b)+|(?:\x01c)$
const convertSpecToRegex = (spec: string): RegExp => {
  // 1. Remove all whitespace
  let s = spec.replace(/\s+/g, '');

  // 2. Tokenize based on DTD delimiters: ( ) , | * + ?
  // using capturing group in split includes delimiters in the result array
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
  
  // 1. Compute line offsets
  const lines = xmlStr.split(/\r\n|\r|\n/);
  const lineOffsets: number[] = [];
  let charCount = 0;
  lines.forEach(line => {
    lineOffsets.push(charCount);
    charCount += line.length + 1; // +1 for newline char assumption
  });

  // 2. Mask Comments and CDATA to avoid false positives in regex
  // Replace content with spaces to preserve indices/line counts
  let maskedXml = xmlStr.replace(/<!--[\s\S]*?-->/g, (match) => ' '.repeat(match.length));
  maskedXml = maskedXml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (match) => ' '.repeat(match.length));

  // 3. Find all start tags in order
  // Regex to match <TagName ... >
  const tagRegex = /<([a-zA-Z0-9_\-.:]+)[^>]*>/g;
  let match;
  const tagLocations: { tagName: string, index: number, line: number }[] = [];
  
  while ((match = tagRegex.exec(maskedXml)) !== null) {
    const tagName = match[1];
    const index = match.index;
    
    // Find line number via binary search or simple loop
    // Simple loop is fast enough for typical XML sizes
    let line = 1;
    for (let i = 0; i < lineOffsets.length; i++) {
        if (index >= lineOffsets[i]) {
            line = i + 1;
        } else {
            break;
        }
    }
    
    tagLocations.push({ tagName, index, line });
  }

  // 4. Traverse DOM and match
  let matchIndex = 0;
  
  const traverse = (node: Element) => {
    const targetTag = node.tagName;
    
    // Scan forward for the next matching tag name
    // (There might be slight desyncs if XML is malformed, but this is heuristic)
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
  
  // Construct location prefixes
  let prefix = `[XML: ${xmlLine}]`;
  if (dtdLine) {
    prefix += ` [DTD: ${dtdLine}]`;
  }

  // 1. Check if element is defined
  if (!def) {
    return [`${prefix} Element <${tagName}> is used in XML but not defined in DTD.`];
  }

  // 2. Validate Content based on Type
  // Use children property if available (Element nodes only), fallback to manual filtering
  const childElements = node.children 
    ? Array.from(node.children) 
    : Array.from(node.childNodes).filter(n => n.nodeType === 1) as Element[];

  const textContent = Array.from(node.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent || '')
    .join('');
  
  // Check if there is actual non-whitespace text
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
      // (#PCDATA|a|b)* - allows text and specific tags
      for (const child of childElements) {
        if (!def.allowedElements?.has(child.tagName)) {
          errors.push(`${prefix} Element <${tagName}> contains unexpected child <${child.tagName}>. Allowed mixed content: ${Array.from(def.allowedElements || []).join(', ')}.`);
        }
      }
      break;

    case 'CHILDREN':
      // Element content - NO text allowed
      if (hasNonWhitespaceText) {
        errors.push(`${prefix} Element <${tagName}> has element-only content definition but contains text data: "${textContent.trim().substring(0, 20)}..."`);
      }

      // Validate structure using Regex
      // Construct subject string using same control char prefix: "\x01child1\x01child2"
      const childSignature = childElements.map(c => `\x01${c.tagName}`).join('');
      
      if (def.regex && !def.regex.test(childSignature)) {
        // Construct a readable version of current children for error message
        const currentChildren = childElements.length > 0 
          ? childElements.map(c => c.tagName).join(', ')
          : 'None';
        
        // Improve error message readability
        const cleanSpec = def.rawSpec.replace(/\s+/g, ' ');
        errors.push(`${prefix} Element <${tagName}> has invalid content structure.\nFound children: [${currentChildren}]\nExpected DTD sequence: ${cleanSpec}`);
      }
      break;

    case 'ANY':
    default:
      // No constraints on children
      break;
  }

  // 3. Recurse for children
  for (const child of childElements) {
    errors.push(...validateNode(child, definitions, lineMap));
  }

  return errors;
};

export const validateXmlWithDtd = async (dtd: string, xml: string): Promise<ValidationResult> => {
  return new Promise((resolve) => {
    // Simulate async processing
    setTimeout(() => {
      try {
        const errors: string[] = [];

        // 1. Parse DTD
        const definitions = parseDtd(dtd);
        if (definitions.size === 0) {
           resolve({
            isValid: false,
            errors: ["No valid ELEMENT definitions found in DTD."],
            generalComment: "DTD parsing failed or input was empty.",
            timestamp: Date.now(),
          });
          return;
        }

        // 2. Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "text/xml");
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
        // Start from root element
        const root = xmlDoc.documentElement;
        if (root) {
            const lineMap = mapElementLines(xml, root);
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
