// ===== Simple Error Page - Complete Override =====
window.SimpleErrorPage = {
  render() {
    console.log('[SimpleErrorPage] Rendering clean white error page');
    
    // NUCLEAR RESET: Remove ALL existing content and styles
    document.body.innerHTML = '';
    document.head.innerHTML = `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Page Not Found</title>
    `;
    
    // Force white background on everything
    document.documentElement.style.cssText = 'background: #ffffff !important; margin: 0; padding: 0;';
    document.body.style.cssText = 'background: #ffffff !important; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;';
    
    // Create clean content
    document.body.innerHTML = `
      <div style="
        width: 100vw; 
        height: 100vh; 
        background: #ffffff; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      ">
        <div style="
          text-align: center; 
          padding: 2rem;
          background: #ffffff;
          color: #000000;
        ">
          <h1 style="
            color: #000000; 
            font-size: 24px; 
            margin-bottom: 16px; 
            font-weight: 400;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">
            Collection not found
          </h1>
          <p style="
            color: #666666; 
            font-size: 16px; 
            margin-bottom: 24px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">
            Invalid URL
          </p>
          <a href="/" style="
            color: #000000; 
            text-decoration: underline;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">
            ← Go back
          </a>
        </div>
      </div>
    `;
  }
};