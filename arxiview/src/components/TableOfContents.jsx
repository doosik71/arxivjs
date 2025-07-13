import { useState, useEffect } from 'react';

const TableOfContents = ({ headers }) => {
  const [activeHeader, setActiveHeader] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      let newActiveHeader = '';

      // Find all header elements that exist in the DOM
      const visibleHeaders = [];
      
      headers.forEach(header => {
        const element = document.getElementById(header.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const offsetTop = rect.top + window.scrollY;
          visibleHeaders.push({
            id: header.id,
            level: header.level,
            offsetTop: offsetTop,
            isVisible: rect.top < window.innerHeight && rect.bottom > 0
          });
        }
      });

      // Sort headers by their position in the document
      visibleHeaders.sort((a, b) => a.offsetTop - b.offsetTop);

      // Find the active header (the last one that's above the scroll position)
      for (let i = 0; i < visibleHeaders.length; i++) {
        if (visibleHeaders[i].offsetTop <= scrollPosition) {
          newActiveHeader = visibleHeaders[i].id;
        } else {
          break;
        }
      }

      // If we're above all headers, activate the first one
      if (!newActiveHeader && visibleHeaders.length > 0) {
        newActiveHeader = visibleHeaders[0].id;
      }
      
      setActiveHeader(newActiveHeader);
    };

    // Use throttling to improve performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [headers]);

  const scrollToHeader = (headerId) => {
    const element = document.getElementById(headerId);
    if (element) {
      const yOffset = -80; // Offset for fixed header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  };

  if (headers.length === 0) {
    return null;
  }

  return (
    <div className="table-of-contents">
      <div className="toc-header">
        <h4>Table of Contents</h4>
        <button 
          className="toc-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Show contents" : "Hide contents"}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>
      
      {!isCollapsed && (
        <nav className="toc-nav">
          <ul className="toc-list">
            {headers.map((header) => {
              const isActive = activeHeader === header.id;
              return (
                <li 
                  key={header.id}
                  className={`toc-item toc-level-${header.level} ${isActive ? 'active' : ''}`}
                >
                  <a
                    href={`#${header.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToHeader(header.id);
                    }}
                    className="toc-link"
                  >
                    {header.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default TableOfContents;