// ===== Error Page =====
// Renders: collection-branded error message for invalid codes or collection mismatches
// Routes: /{collection}/error

window.ErrorPage = {
  
  render() {
    const { collection } = window.App.route;
    const raw = window.App.data?.theme?.raw || {};
    const bgData = window.App.bgData || {};
    
    // Get branding from template setup (now loaded with collection data), fallback to get-bg data
    const logoSrc = raw.header_logo_url || bgData.logo_url || 'https://xkfwlcyntfcfouvgmdvj.supabase.co/storage/v1/object/public/experience-assets/header-logos/Isolation_Mode.svg';
    
    console.log('[ErrorPage] Using logo:', logoSrc);
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
              <h2 class="error-title">Collectible Not Found</h2>
              <p class="error-description">
                This collectible doesn't belong to this experience or wasn't found in our database.
              </p>
            </div>
          </main>
        </div>
      </div>
    `;

    window.hideLoading();
  }
};