import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export const parseMarkdownWithMath = (text) => {
  if (!text) return [];

  const lines = text.split('\n');
  const elements = [];
  let currentParagraph = [];
  let listItems = [];
  let inMathBlock = false;
  let mathContent = '';

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={elements.length}>
          {parseInlineContent(currentParagraph.join(' '))}
        </p>
      );
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={elements.length}>
          {listItems.map((item, index) => (
            <li key={index}>{parseInlineContent(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Handle math blocks ($$...$$)
    if (trimmedLine === '$$') {
      if (inMathBlock) {
        // End of math block
        flushParagraph();
        flushList();
        elements.push(
          <div key={elements.length} className="math-block">
            <BlockMath math={mathContent.trim()} />
          </div>
        );
        mathContent = '';
        inMathBlock = false;
      } else {
        // Start of math block
        flushParagraph();
        flushList();
        inMathBlock = true;
      }
      continue;
    }

    if (inMathBlock) {
      mathContent += line + '\n';
      continue;
    }

    // Handle headers
    if (trimmedLine.startsWith('# ')) {
      flushParagraph();
      flushList();
      elements.push(<h2 key={elements.length}>{trimmedLine.substring(2)}</h2>);
    } else if (trimmedLine.startsWith('## ')) {
      flushParagraph();
      flushList();
      elements.push(<h3 key={elements.length}>{trimmedLine.substring(3)}</h3>);
    } else if (trimmedLine.startsWith('### ')) {
      flushParagraph();
      flushList();
      elements.push(<h4 key={elements.length}>{trimmedLine.substring(4)}</h4>);
    }
    // Handle list items
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      flushParagraph();
      listItems.push(trimmedLine.substring(2));
    }
    // Handle empty lines
    else if (trimmedLine === '') {
      flushParagraph();
      flushList();
    }
    // Handle regular paragraphs
    else {
      flushList();
      currentParagraph.push(line);
    }
  }

  // Flush remaining content
  flushParagraph();
  flushList();

  return elements;
};

const parseInlineContent = (text) => {
  const parts = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // Check for inline math $...$
    if (text[i] === '$' && i + 1 < text.length && text[i + 1] !== '$') {
      // Find closing $
      let j = i + 1;
      while (j < text.length && text[j] !== '$') {
        j++;
      }
      
      if (j < text.length) {
        // Found closing $
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const mathContent = text.substring(i + 1, j);
        parts.push(
          <InlineMath key={parts.length} math={mathContent} />
        );
        
        i = j + 1;
        continue;
      }
    }
    
    // Check for bold **text**
    if (text.substring(i, i + 2) === '**') {
      let j = i + 2;
      while (j < text.length - 1 && text.substring(j, j + 2) !== '**') {
        j++;
      }
      
      if (j < text.length - 1) {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const boldContent = text.substring(i + 2, j);
        parts.push(
          <strong key={parts.length}>{boldContent}</strong>
        );
        
        i = j + 2;
        continue;
      }
    }
    
    // Check for italic *text*
    if (text[i] === '*' && text.substring(i, i + 2) !== '**') {
      let j = i + 1;
      while (j < text.length && text[j] !== '*') {
        j++;
      }
      
      if (j < text.length) {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        const italicContent = text.substring(i + 1, j);
        parts.push(
          <em key={parts.length}>{italicContent}</em>
        );
        
        i = j + 1;
        continue;
      }
    }
    
    currentText += text[i];
    i++;
  }

  if (currentText) {
    parts.push(currentText);
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
};