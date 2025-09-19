import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';

// MathJax configuration
const initMathJax = () => {
  if (typeof window !== 'undefined' && !window.MathJax) {
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']],
        packages: { '[+]': ['base', 'ams', 'physics', 'mhchem', 'color'] },
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        renderActions: {
          addMenu: [0, '', '']
        }
      },
      startup: {
        ready: () => {
          window.MathJax.startup.defaultReady();
          // console.log('MathJax is ready');
        }
      }
    };

    // Load MathJax script if not already loaded
    if (!document.querySelector('script[src*="mathjax"]')) {
      const mathJaxScript = document.createElement('script');
      mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      mathJaxScript.async = true;
      mathJaxScript.onload = () => {
        // console.log('MathJax script loaded');
      };
      document.head.appendChild(mathJaxScript);
    }
  }
};

// Initialize MathJax
initMathJax();

const toHexEntity = (str) => {
  return Array.from(str).map(char => {
    const hex = char.codePointAt(0).toString(16);
    return `&#x${hex};`;
  }).join('');
}

const fromHexEntity = (encoded) => {
  return encoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCodePoint(parseInt(hex, 16));
  });
}

// Math protection system - using pre/code wrapper approach
const protectMathExpressions = (text) => {
  let protectedText = text;

  // Protect block math ($$...$$)
  protectedText = protectedText.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => {
    return `<pre><code class="latex-math-2">${toHexEntity(inner)}</code></pre>`;
  });

  // Protect inline math ($...$)
  protectedText = protectedText.replace(/\$([^\n\r$]+?)\$/g, (_, inner) => {
    return `<code class="latex-math-1">${toHexEntity(inner)}</code>`;
  });

  return protectedText;
};

const restoreMathExpressions = (htmlContent) => {
  let restoredContent = htmlContent;

  // Restore inline math
  restoredContent = restoredContent.replace(
    /<code class="latex-math-1">([^\n\r$]+?)<\/code>/g,
    (_, inner) => `$${fromHexEntity(inner)}$`
  );

  // Restore block math
  restoredContent = restoredContent.replace(
    /<pre><code class="latex-math-2">([\s\S]+?)<\/code><\/pre>/g,
    (_, inner) => `$$${fromHexEntity(inner)}$$`
  );

  return restoredContent;
};

// Fix Korean markdown formatting issues
const fixKoreanFormatting = (htmlContent) => {
  return htmlContent.replace(/\*\*([^*\r\n]+)\*\*/g, '<strong>$1</strong>');
};

// Generate table of contents from text
export const extractTableOfContents = (text) => {
  if (!text) return [];

  const lines = text.split('\n');
  const headers = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('# ')) {
      headers.push({
        level: 1,
        text: trimmedLine.substring(2).trim(),
        id: generateId(trimmedLine.substring(2).trim())
      });
    } else if (trimmedLine.startsWith('## ')) {
      headers.push({
        level: 2,
        text: trimmedLine.substring(3).trim(),
        id: generateId(trimmedLine.substring(3).trim())
      });
    } else if (trimmedLine.startsWith('### ')) {
      headers.push({
        level: 3,
        text: trimmedLine.substring(4).trim(),
        id: generateId(trimmedLine.substring(4).trim())
      });
    }
  }

  return headers;
};

// Generate URL-safe ID from text
const generateId = (text) => {
  // Remove emojis and special characters, keep Korean/English/numbers
  const cleanText = text
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
    .replace(/[^\w\s가-힣-]/g, '') // Keep only word characters, spaces, Korean characters, and hyphens
    .trim();

  // If text becomes empty after cleaning, use a fallback
  if (!cleanText) {
    return `header-${Math.random().toString(36).substring(2, 11)}`;
  }

  return cleanText
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// MathJax Component for rendering math expressions
const MathJaxComponent = ({ children }) => {
  const mathRef = useRef(null);

  useEffect(() => {
    const renderMath = () => {
      if (mathRef.current && window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([mathRef.current]).catch((err) => {
          console.error('MathJax rendering error:', err);
        });
      }
    };

    // If MathJax is already loaded, render immediately
    if (window.MathJax && window.MathJax.startup && window.MathJax.startup.document) {
      renderMath();
    } else {
      // Wait for MathJax to load
      const checkMathJax = setInterval(() => {
        if (window.MathJax && window.MathJax.startup && window.MathJax.startup.document) {
          clearInterval(checkMathJax);
          renderMath();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkMathJax), 10000);
    }
  }, [children]);

  return <div ref={mathRef}>{children}</div>;
};

export const parseMarkdownWithMath = (text) => {
  if (!text) return [];

  // First, protect math expressions
  let markdownText = protectMathExpressions(text);

  // Use marked to parse markdown
  let htmlContent = marked(markdownText, {
    mangle: false,
    headerIds: false
    // breaks: true, // Convert single line breaks to <br>
    // gfm: true // GitHub Flavored Markdown
  });

  // Restore math expressions
  htmlContent = restoreMathExpressions(htmlContent);

  // Fix Korean formatting issues that marked might have missed
  htmlContent = fixKoreanFormatting(htmlContent);

  // Parse HTML content to React elements
  const elements = parseHTMLToReact(htmlContent);

  // Wrap all elements in MathJax component for math rendering
  return [<MathJaxComponent key="mathjax-wrapper">{elements}</MathJaxComponent>];
};

const parseHTMLToReact = (htmlContent) => {
  // Simple HTML to React parser for marked output
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');

  const convertElement = (element, key = 0) => {
    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent;
    }

    if (element.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const tagName = element.tagName.toLowerCase();
    const children = Array.from(element.childNodes).map((child, index) =>
      convertElement(child, index)
    ).filter(child => child !== null);

    // Add IDs to headers for TOC
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const textContent = element.textContent;
      const headerId = generateId(textContent);
      return React.createElement(
        tagName,
        {
          key,
          id: headerId,
          className: 'header-with-anchor'
        },
        textContent
      );
    }

    if (tagName === 'p') {
      return React.createElement(
        'p',
        { key },
        ...children
      );
    }

    if (tagName === 'li') {
      return React.createElement(
        'li',
        { key },
        ...children
      );
    }

    // For other elements, just pass through
    const props = { key };

    // Copy attributes
    for (let attr of element.attributes) {
      if (attr.name === 'class') {
        props.className = attr.value;
      } else {
        props[attr.name] = attr.value;
      }
    }

    return React.createElement(tagName, props, ...children);
  };

  const bodyDiv = doc.querySelector('div');
  const elements = Array.from(bodyDiv.childNodes).map((child, index) =>
    convertElement(child, index)
  ).filter(element => element !== null);

  return elements;
};

