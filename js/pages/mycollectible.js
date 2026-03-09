// ===== Mycollectible Page =====
// URL: /[collection]/mycollectible/[mintcode]
//
// Flow:
//   1. Call check-mint-code-status with code from URL
//   2. If claimed → render page (artwork from CMS + debug info below)
//   3. If not claimed → redirect to mint page

window.MycollectiblePage = {

  async render() {
    try {
      await this._render();
    } catch (err) {
      console.error('[MycollectiblePage] Unhandled error:', err);
      document.getElementById('app').innerHTML =
        `<p style="padding:2rem;text-align:center;font-family:sans-serif;color:red">Error: ${err.message}</p>`;
      window.hideLoading();
    }
  },

  async _render() {
    const { collection, code } = window.App.route;
    const SUPABASE_URL = window.App.supabaseUrl;

    if (!code) {
      // No code in URL → go to mint (loading screen stays up during transition)
      window.navigateTo(collection, 'mint', null);
      return;
    }

    // Use pushState data if coming from mint (avoids timing issues with fresh claims).
    // Fall back to API fetch for direct URL access.
    let status = window.history.state?.claimed ? window.history.state : null;
    console.log('[Mycollectible] history.state:', window.history.state, '→ using state:', !!status);

    if (!status) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-mint-code-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_hash: code }),
        });
        status = await res.json();
        console.log('[Mycollectible] API status:', status);
      } catch (err) {
        console.error('[Mycollectible] Status check failed:', err);
      }
    }

    // Not claimed → redirect to mint (loading screen stays up during transition)
    if (!status || !status.claimed) {
      window.navigateTo(collection, 'mint', code);
      return;
    }

    // ── Render the collectible page ──
    const cms = window.App.data?.cms || {};
    const raw = window.App.data?.theme?.raw || {};

    const footerLogoSrc = raw.footer_logo_url;
    const artworkSrc    = cms.main_image_url;
    const location      = cms.location;
    const contactTitle  = cms.title;

    // Format claimed_on date
    const claimedOn      = status.claimed_on  || '';
    const claimedAddress = status.claimed_address || '';
    const claimedDate    = claimedOn ? new Date(claimedOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    document.getElementById('app').innerHTML = `
      <!-- SCREEN: MYCOLLECTIBLE (confirmation view) -->
      <div id="screen-confirmation" class="screen active">

        <!-- Header -->
        <div class="confirm-header">
          <img src="${artworkSrc}" alt="Profile" class="confirm-photo">
          <span class="confirm-name">${contactTitle}</span>
        </div>

        <div class="confirm-body">

          <!-- Contact Card -->
          <div class="contact-card">
            <h2 class="contact-heading">${contactTitle}</h2>
            <p class="contact-meta">
              Claimed on<br>
              <span class="meta-detail">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${claimedDate}
                ${location ? `&nbsp;&nbsp;<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${location}</span>` : ''}
              </span>
            </p>
            <div class="contact-divider"></div>
            <h4 class="contact-section-title">[NO CONTACT DETAILS CONFIGURED]</h4>
            <p style="color: #ff4444; padding: 20px; text-align: center; font-size: 14px;">Contact information not configured for this collection</p>

            <button class="cta-button cta-save">Save Contact</button>
            <a href="#" class="add-homescreen">Add to Home Screen</a>
          </div>

          <!-- Digital Souvenir -->
          <div class="souvenir-section">
            <h3 class="souvenir-title">YOUR DIGITAL SOUVENIR</h3>
            <div class="souvenir-artwork-wrapper">
              <img id="souvenir-artwork" src="${artworkSrc}" alt="Digital Souvenir" class="souvenir-artwork">
            </div>

            <!-- Debug info: mint-specific data from check-mint-code-status -->
            <div class="souvenir-debug">
              <p>Owned by: <span>${claimedAddress || '—'}</span></p>
              <p>Claimed on: <span>${claimedDate}</span></p>
            </div>

            <p class="souvenir-thanks">Thanks for connecting!</p>
            <p class="souvenir-sub">Here's a digital souvenir to<br>remember our meeting.</p>
            <a href="#" class="souvenir-link">View collectible</a>
          </div>

          <!-- Footer -->
          <footer class="landing-footer">
            <div class="footer-top">
              <div class="footer-left">
                ${footerLogoSrc ? `<img src="${footerLogoSrc}" alt="Logo" class="footer-logo">` : '<span style="color:#ff4444">[FOOTER LOGO NOT CONFIGURED]</span>'}
              </div>
              <div class="footer-right">
                <span class="footer-powered">Powered by POAP STUDIO</span>
              </div>
            </div>
            <div class="footer-links">
              <a href="#" class="footer-link">Terms &amp; Conditions</a>
              <span class="footer-sep">|</span>
              <a href="#" class="footer-link">Privacy Policy</a>
            </div>
          </footer>
        </div>
      </div>
    `;

    // Reveal page — loading screen was covering everything during the async check
    const screenEl = document.getElementById('screen-confirmation');
    if (screenEl) screenEl.classList.add('visible');

    window.hideLoading();
  },
};
