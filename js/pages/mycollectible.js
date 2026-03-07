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

    const PROFILE_PHOTO = 'https://xkfwlcyntfcfouvgmdvj.supabase.co/storage/v1/object/public/experience-assets/poap-artwork/7dce8f163f576033cd745748a5358eb52d582b8b.png';
    const footerLogoSrc = raw.footer_logo_url || 'https://xkfwlcyntfcfouvgmdvj.supabase.co/storage/v1/object/public/experience-assets/footer-logos/POAP%20STUDIO.svg';
    const artworkSrc    = cms.main_image_url  || 'https://assets.poap.xyz/bpifrance-youve-met-selin-suntay-2026-logo-1771529067684.png';
    const location      = cms.location        || 'Brussels';
    const contactTitle  = cms.title           || 'Let\'s Stay in Touch!';

    // Format claimed_on date
    const claimedOn      = status.claimed_on  || '';
    const claimedAddress = status.claimed_address || '';
    const claimedDate    = claimedOn ? new Date(claimedOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    document.getElementById('app').innerHTML = `
      <!-- SCREEN: MYCOLLECTIBLE (confirmation view) -->
      <div id="screen-confirmation" class="screen active">

        <!-- Navy Header -->
        <div class="confirm-header">
          <img src="${PROFILE_PHOTO}" alt="Selin Suntay" class="confirm-photo">
          <span class="confirm-name">Selin<br>Suntay</span>
        </div>

        <div class="confirm-body">

          <!-- Contact Card -->
          <div class="contact-card">
            <h2 class="contact-heading">${contactTitle}</h2>
            <p class="contact-meta">
              We've met on<br>
              <span class="meta-detail">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Feb. 23, 2026
                &nbsp;&nbsp;
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${location}</span>
              </span>
            </p>
            <div class="contact-divider"></div>
            <h4 class="contact-section-title">MY CONTACT DETAILS</h4>

            <a href="mailto:selin.s@bpifrance.fr" class="contact-row">
              <div class="contact-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>
              </div>
              <div class="contact-info">
                <span class="contact-label">EMAIL</span>
                <span class="contact-value">selin.s@bpifrance.fr</span>
              </div>
              <svg class="contact-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>

            <a href="https://linkedin.com/in/selinsuntay" target="_blank" rel="noopener" class="contact-row">
              <div class="contact-icon linkedin-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </div>
              <div class="contact-info">
                <span class="contact-label">LINKEDIN</span>
                <span class="contact-value">/in/selinsuntay</span>
              </div>
              <svg class="contact-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>

            <a href="https://t.me/selinsuntay" target="_blank" rel="noopener" class="contact-row">
              <div class="contact-icon telegram-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#229ED9"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </div>
              <div class="contact-info">
                <span class="contact-label">TELEGRAM</span>
                <span class="contact-value">@selinsuntay</span>
              </div>
              <svg class="contact-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>

            <a href="#" class="contact-row">
              <div class="contact-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="contact-info">
                <span class="contact-label">SCHEDULE A MEETING</span>
                <span class="contact-value">View my availability</span>
              </div>
              <svg class="contact-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>

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
                <img src="${PROFILE_PHOTO}" alt="Selin Suntay" class="footer-photo">
                <span class="footer-name">Selin<br>Suntay</span>
              </div>
              <div class="footer-right">
                <span class="footer-powered">Powered by</span>
                <img src="${footerLogoSrc}" alt="POAP STUDIO" class="footer-logo">
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
