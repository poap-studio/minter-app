// ===== Error Page =====
// Renders: collection-branded error message for invalid codes or collection mismatches
// Routes: /{collection}/error

window.ErrorPage = {
  
  render() {
    const { collection } = window.App.route;
    const raw = window.App.data?.theme?.raw || {};
    const bgData = window.App.bgData || {};
    const errorData = window.App.errorData || {};
    
    // Get branding from template setup (now loaded with collection data), fallback to get-bg data
    const logoSrc = raw.header_logo_url || bgData.logo_url;
    
    // Use backend error/message if available
    const errorTitle = errorData.error || 'Error';
    const errorMessage = errorData.message || '[ERROR MESSAGE NOT CONFIGURED]';
    
    console.log('[ErrorPage] Using logo:', logoSrc);
    console.log('[ErrorPage] Backend error:', errorData);
    console.log('[ErrorPage] Theme data:', raw);
    console.log('[ErrorPage] BG data fallback:', bgData);
    
    const appEl = document.getElementById('app');
    if (!appEl) { 
      console.error('[ErrorPage] #app not found'); 
      window.hideLoading(); 
      return; 
    }

    appEl.innerHTML = `
      <!-- ERROR SCREEN -->
      <div id="screen-error" class="screen error-screen active">
        <div class="error-container">
          <!-- Header with collection logo -->
          <header class="error-header">
            <img src="${logoSrc}" alt="Logo" class="error-logo">
          </header>
          
          <!-- Error content -->
          <main class="error-content">
            <div class="error-message">
              <h2 class="error-title">${errorTitle}</h2>
              <p class="error-description">${errorMessage}</p>
            </div>
          </main>
        </div>
      </div>
    `;

    window.hideLoading();
  }
};