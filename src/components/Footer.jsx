const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-info">
            <p>&copy; 2024 ArxiView - Read-only interface for ArxivJS</p>
            <p>A tool for browsing and viewing research papers with AI-generated summaries</p>
          </div>
          <div className="footer-links">
            <a 
              href="https://github.com/doosik71/arxivjs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              <span className="footer-link-icon">⭐</span>
              View on GitHub
            </a>
            <span className="footer-separator">•</span>
            <span className="footer-version">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;