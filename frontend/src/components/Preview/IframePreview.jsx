import React, { useRef, useEffect, useState } from 'react';
import { RefreshCw, Maximize2, AlertCircle } from 'lucide-react';
import './IframePreview.css';

export const IframePreview = ({ files, currentFile }) => {
  const iframeRef = useRef(null);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshPreview();
  }, [files, currentFile]);

  const refreshPreview = () => {
    if (!iframeRef.current) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const htmlContent = generateHTMLContent(files);
      const iframe = iframeRef.current;
      
      // Write content to iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Listen for errors in iframe
      iframe.contentWindow.addEventListener('error', (e) => {
        setError({
          message: e.message,
          line: e.lineno,
          column: e.colno
        });
      });

    } catch (err) {
      setError({
        message: err.message
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const generateHTMLContent = (filesList) => {
    // Find HTML, CSS, and JS files
    const htmlFile = filesList?.find(f => 
      f.path.endsWith('.html') || f.language === 'html'
    );
    
    const cssFiles = filesList?.filter(f => 
      f.path.endsWith('.css') || f.language === 'css'
    ) || [];
    
    const jsFiles = filesList?.filter(f => 
      f.path.endsWith('.js') || 
      f.path.endsWith('.jsx') || 
      f.language === 'javascript'
    ) || [];

    // Build HTML
    let html = '';

    if (htmlFile) {
      html = htmlFile.content;
    } else {
      // Generate basic HTML template
      html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
  </style>
</head>
<body>
  <div id="root"></div>
</body>
</html>
      `;
    }

    // Inject CSS
    if (cssFiles.length > 0) {
      const cssContent = cssFiles.map(f => f.content).join('\n\n');
      html = html.replace(
        '</head>',
        `<style>${cssContent}</style>\n</head>`
      );
    }

    // Inject JavaScript
    if (jsFiles.length > 0) {
      const jsContent = jsFiles.map(f => f.content).join('\n\n');
      html = html.replace(
        '</body>',
        `<script type="module">\n${jsContent}\n</script>\n</body>`
      );
    }

    return html;
  };

  const handleRefresh = () => {
    refreshPreview();
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="iframe-preview">
      <div className="preview-header">
        <h3>Preview</h3>
        <div className="preview-actions">
          <button
            onClick={handleRefresh}
            className="preview-button"
            title="Refresh"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          </button>
          <button
            onClick={handleFullscreen}
            className="preview-button"
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="preview-error">
          <AlertCircle size={16} />
          <div className="error-content">
            <strong>Error:</strong> {error.message}
            {error.line && (
              <span className="error-location">
                at line {error.line}:{error.column}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="preview-content">
        <iframe
          ref={iframeRef}
          title="preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          className="preview-iframe"
        />
      </div>
    </div>
  );
};
