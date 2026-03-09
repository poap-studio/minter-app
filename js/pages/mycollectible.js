// ===== My Collectible Page =====
// Renders: profile card + expanded description + CTA (no form)
// Case 1: Direct entry → get_template_setup + check-mint-code-status  
// Case 2: Transition from mint → get_template_setup (cached) + claim data (state)

window.MycollectiblePage = {

  // ── Load claim data for direct entry ──
  async loadClaimData(code) {
    try {
      console.log('[MycollectiblePage] Loading claim data for:', code);
      const res = await fetch(`${window.App.supabaseUrl}/functions/v1/check-mint-code-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_hash: code })
      });
      const data = await res.json();
      console.log('[MycollectiblePage] Claim data:', data);
      
      if (data.exists && data.claimed) {
        return {
          claimed: true,
          claimed_address: data.claimed_address,
          claimed_on: data.claimed_on,
          token_id: data.token_id,
          collector_order: data.collector_order,
          total_codes: data.total_codes,
          qr_hash: data.qr_hash
        };
      } else {
        throw new Error('Token not claimed or does not exist');
      }
    } catch (err) {
      console.error('[MycollectiblePage] Failed to load claim data:', err);
      return null;
    }
  },

  // ── Inject HTML into #app ──
  async render() {
    const { collection, code } = window.App.route;
    
    // 1. Theme/CMS data already loaded by router
    const cms = window.App.data?.cms || {};
    const cmsDefaults = window.App.data?.cms_defaults || {};
    const setup = window.App.data?.setup || {};
    const raw = window.App.data?.theme?.raw || {};

    // 2. Get claim data (from state or fetch)
    const navState = window.history.state;
    let claimData;
    
    if (navState?.claimed) {
      // Case 2: Transition from mint → use state data
      console.log('[MycollectiblePage] Using claim data from navigation state');
      claimData = navState;
    } else {
      // Case 1: Direct entry → call check-mint-code-status
      console.log('[MycollectiblePage] Direct entry, fetching claim data');
      claimData = await this.loadClaimData(code);
    }
    
    if (!claimData) {
      // Error state - redirect to mint page
      console.error('[MycollectiblePage] No claim data available, redirecting to mint');
      window.navigateTo(collection, 'mint', code);
      return;
    }

    // 3. Prepare display data
    const headerLogoSrc  = raw.header_logo_url;
    const footerLogoSrc  = raw.footer_logo_url;
    const artworkSrc     = cms.main_image_url;
    const detailsTitle   = cms.title;
    const detailsText    = cms.collected_description;
    
    // Button texts and URLs (hide if null)
    const buttonText = cmsDefaults.mycollectible_button_text;
    const buttonUrl = cmsDefaults.mycollectible_button_url;
    
    // Legal URLs with fallbacks
    const termsUrl = setup.terms_url || '#';
    const privacyUrl = setup.privacy_url || '#';
    
    // Format claim data for display
    const collectorInfo = claimData.collector_order && claimData.total_codes 
      ? `# ${claimData.collector_order}/${claimData.total_codes} Collectors`
      : null;
    const tokenId = claimData.token_id ? `ID ${claimData.token_id}` : null;
    const collectedDate = this.formatDate(claimData.claimed_on);
    const ownerAddress = claimData.claimed_address ? claimData.claimed_address.toUpperCase() : null;

    const appEl = document.getElementById('app');
    if (!appEl) { console.error('[MycollectiblePage] #app not found'); window.hideLoading(); return; }
    appEl.innerHTML = `
      <!-- SCREEN: MY COLLECTIBLE -->
      <div id="screen-landing" class="screen active">
        <div class="mint-container">

          <!-- Header Logo -->
          <header class="mint-header">
            <img src="${headerLogoSrc}" alt="Company Logo" class="header-logo">
          </header>

          <!-- POAP Card -->
          <div class="poap-card">
            <div class="poap-card-inner">
              <div class="poap-card-content">
                <div class="card-header">
                  <div class="card-badge">
                    <img src="${raw.card_logo_url || headerLogoSrc}" alt="Badge" class="card-badge-img">
                  </div>
                  ${collectorInfo ? `<div class="card-collector-info">${collectorInfo}</div>` : ''}
                  ${tokenId ? `<div class="card-token-id">${tokenId}</div>` : ''}
                </div>

                <div class="card-artwork">
                  <img src="${artworkSrc}" alt="POAP Artwork" class="poap-artwork">
                </div>
                
                <!-- Claim Info Extension -->
                <div class="card-claim-info">
                  ${collectedDate ? `
                    <div class="claim-date">
                      <svg class="claim-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Collected on ${collectedDate}
                    </div>
                  ` : ''}
                  ${ownerAddress ? `
                    <div class="claim-owner">
                      <span class="owner-label">OWNED BY</span>
                      <span class="owner-address">${ownerAddress}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- CTA Button (only if configured) -->
          ${buttonText && buttonUrl && buttonUrl !== '#' ? `
            <div class="cta-section">
              <a href="${buttonUrl}" target="_blank" class="cta-button" style="text-decoration: none; display: flex;">
                <span class="cta-text">${buttonText}</span>
              </a>
            </div>
          ` : ''}

          <!-- Details Panel (Always Expanded) -->
          <div class="details-panel details-expanded">
            <div class="details-content">
              <h3 class="details-heading">${detailsTitle}</h3>
              ${this.renderDateLocationSection(cms)}
              <p class="details-text">${detailsText}</p>
            </div>
          </div>

          <!-- Footer -->
          <footer class="mint-footer">
            <div class="footer-top">
              <div class="footer-left">
                <img src="${footerLogoSrc || headerLogoSrc}" alt="Footer Logo" class="footer-logo-img">
              </div>
              <div class="footer-right">
                <span class="footer-powered">Powered by POAP STUDIO</span>
              </div>
            </div>
            <div class="footer-links">
              <a href="${termsUrl}" class="footer-link" target="_blank">Terms &amp; Conditions</a>
              <span class="footer-sep">|</span>
              <a href="${privacyUrl}" class="footer-link" target="_blank">Privacy Policy</a>
            </div>
          </footer>
        </div>
      </div>
    `;

    // Apply screen visibility (same as mint page)
    const screenEl = document.getElementById('screen-landing');
    if (screenEl) screenEl.classList.add('visible');
    
    // No JavaScript interactions needed (no form, no toggles)
    window.hideLoading();
  },

  // ── Format date to DD mm. YY format ──
  formatDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = monthNames[date.getMonth()];
      const year = String(date.getFullYear()).slice(-2);
      
      return `${day} ${month}. ${year}`;
    } catch (err) {
      console.warn('[MycollectiblePage] Invalid date format:', dateString);
      return dateString; // Return original if parsing fails
    }
  },

  // ── Render date and location section ──
  renderDateLocationSection(cms) {
    const date = cms?.date;
    const location = cms?.location;
    
    // Si ambos son null, no mostrar nada
    if (!date && !location) {
      return '';
    }
    
    // Format date and check if we have valid data
    const formattedDate = this.formatDate(date);
    const hasDate = formattedDate && formattedDate.trim();
    const hasLocation = location && location.trim();
    const centerClass = (hasDate && hasLocation) ? '' : 'center-single';
    
    return `
      <div class="details-meta ${centerClass}">
        ${hasDate ? `
          <div class="meta-item">
            <svg class="meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="meta-text">${formattedDate}</span>
          </div>
        ` : ''}
        ${hasLocation ? `
          <div class="meta-item">
            <svg class="meta-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span class="meta-text">${hasLocation}</span>
          </div>
        ` : ''}
      </div>
      <div class="meta-divider"></div>
    `;
  }
};