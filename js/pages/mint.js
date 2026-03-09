// ===== Mint Page =====
// Renders: profile card + CTA + accordion + form bottom sheet
// On claim success → navigateTo mycollectible
// On already-claimed mintcode → navigateTo mycollectible

window.MintPage = {

  // ── Resolve mint identifier from URL code segment or query param ──
  resolveMintIdentifier(code) {
    const raw = code || new URLSearchParams(window.location.search).get('mintcode') || '';
    const value = raw.trim();
    if (!value) return { type: 'none', value: null };
    if (/^[a-zA-Z0-9]{6}$/.test(value))     return { type: 'mintcode', value };
    if (/^[a-zA-Z0-9-]{7,100}$/.test(value)) return { type: 'slug',     value };
    return { type: 'invalid', value };
  },

  // ── Render a single custom field based on its type ──
  renderField(field) {
    const label     = field.label;           // edge already applies override_label
    const name      = field.field_name;      // field_name, not name
    const required  = field.is_required;
    const options   = field.options || [];   // edge already applies override_options
    const reqAttr   = required ? 'required' : '';
    const reqMark   = required ? ' <span style="color:var(--btn-bg-color)">*</span>' : '';
    const walletClass = field.for_wallet ? 'cf-for-wallet' : '';
    const wrapperClass = walletClass ? `class="form-field ${walletClass}"` : 'class="form-field"';

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'number':
      case 'phone':
        return `
          <div ${wrapperClass}>
            <label class="form-label" for="cf_${name}">${label}${reqMark}</label>
            <input type="${field.field_type === 'phone' ? 'tel' : field.field_type}"
              id="cf_${name}" name="cf_${name}" class="form-input"
              placeholder="${label}" ${reqAttr}>
          </div>`;

      case 'textarea':
        return `
          <div ${wrapperClass}>
            <label class="form-label" for="cf_${name}">${label}${reqMark}</label>
            <textarea id="cf_${name}" name="cf_${name}" class="form-input"
              placeholder="${label}" rows="3" ${reqAttr}></textarea>
          </div>`;

      case 'select':
        return `
          <div ${wrapperClass}>
            <label class="form-label" for="cf_${name}">${label}${reqMark}</label>
            <div class="select-wrapper">
              <select id="cf_${name}" name="cf_${name}" class="form-select" ${reqAttr}>
                <option value="" disabled selected>${label}</option>
                ${options.map(o => `<option value="${o}">${o}</option>`).join('')}
              </select>
              <svg class="select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>`;

      case 'checkbox':
        return `
          <div ${wrapperClass}>
            <div class="form-checkbox-row">
              <input type="checkbox" id="cf_${name}" name="cf_${name}" class="form-checkbox" ${reqAttr}>
              <label class="form-checkbox-label" for="cf_${name}">${label}${reqMark}</label>
            </div>
          </div>`;

      case 'radio':
        return `
          <div ${wrapperClass}>
            <fieldset class="form-radio-group">
              <legend class="form-label">${label}${reqMark}</legend>
              ${options.map((o, i) => `
                <div class="form-radio-row">
                  <input type="radio" id="cf_${name}_${i}" name="cf_${name}" value="${o}" ${reqAttr}>
                  <label for="cf_${name}_${i}">${o}</label>
                </div>`).join('')}
            </fieldset>
          </div>`;

      default:
        return `
          <div ${wrapperClass}>
            <label class="form-label" for="cf_${name}">${label}${reqMark}</label>
            <input type="text" id="cf_${name}" name="cf_${name}" class="form-input"
              placeholder="${label}" ${reqAttr}>
          </div>`;
    }
  },

  // ── Render main address field with conditional label ──
  renderMainAddressField() {
    const mintingType = window.App.data?.setup?.minting_type || 'all';
    let label, inputType, placeholder, errorMessage;
    
    switch (mintingType) {
      case 'mail':
        label = 'Enter your email:';
        inputType = 'email';
        placeholder = 'your@email.com';
        errorMessage = 'Please enter a valid email address';
        break;
      case 'wallet':
        label = 'Enter your wallet address or ENS:';
        inputType = 'text';
        placeholder = 'Wallet / ENS';
        errorMessage = 'Please enter a valid wallet address or ENS domain';
        break;
      default: // 'all'
        label = 'Enter your wallet address, ENS or email:';
        inputType = 'text';
        placeholder = 'Wallet / ENS / Email';
        errorMessage = 'Please enter a valid wallet address, ENS domain or email';
    }
    
    return `
      <label class="form-label" for="wallet_or_email">${label} <span style="color:var(--btn-bg-color)">*</span></label>
      <input type="${inputType}" id="wallet_or_email" name="wallet_or_email" class="form-input" 
        placeholder="${placeholder}" required>
      <div id="address-format-error" class="address-error" style="display:none;">
        ${errorMessage}
      </div>
    `;
  },

  // ── Render all custom fields for the minting form ──
  renderCustomFields() {
    const fields = (window.App.data?.customFields || [])
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return fields.map(f => this.renderField(f)).join('');
  },

  // ── Address type detection ──
  detectAddressType(input) {
    const trimmed = input.trim().toLowerCase();
    
    // EVM wallet address
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      return 'wallet';
    }
    
    // ENS/ETH domains (including subdomains)
    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.(eth|ens)$/i.test(trimmed)) {
      return 'ens'; 
    }
    
    // Email (classic pattern)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'email';
    }
    
    return 'unknown';
  },

  // ── Validate address format based on minting type ──
  isValidAddressFormat(addressType, mintingType) {
    switch (mintingType) {
      case 'mail':
        return addressType === 'email';
      case 'wallet':
        return addressType === 'wallet' || addressType === 'ens';
      default: // 'all'
        return addressType === 'wallet' || addressType === 'ens' || addressType === 'email';
    }
  },

  // ── Toggle wallet fields visibility ──
  toggleWalletFields(isWalletType) {
    const walletFields = document.querySelectorAll('.cf-for-wallet');
    walletFields.forEach(field => {
      if (isWalletType) {
        field.style.display = 'block';
        setTimeout(() => {
          field.classList.add('visible');
        }, 10); // Small delay for smooth transition
      } else {
        field.classList.remove('visible');
        setTimeout(() => {
          field.style.display = 'none';
        }, 300);
      }
    });
  },

  // ── Debounce helper ──
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
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
      console.warn('[MintPage] Invalid date format:', dateString);
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
  },

  // ── Inject HTML into #app ──
  render() {
    const { collection, code } = window.App.route;
    const cms = window.App.data?.cms || {};
    const cmsDefaults = window.App.data?.cms_defaults || {};
    const setup = window.App.data?.setup || {};
    const raw = window.App.data?.theme?.raw || {};
    const mintId = this.resolveMintIdentifier(code);

    const headerLogoSrc  = raw.header_logo_url;
    const footerLogoSrc  = raw.footer_logo_url;
    const artworkSrc     = cms.main_image_url;
    const detailsTitle   = cms.title;
    const detailsText    = cms.available_description;
    
    // Button texts with fallbacks - store on object for access in init()
    this.mintPageButtonText = cmsDefaults.mintpage_button_text || 'Get Collectible';
    this.mintFormButtonText = cmsDefaults.mintform_button_text || 'Mint';
    
    // Legal URLs with fallbacks
    const termsUrl = setup.terms_url || '#';
    const privacyUrl = setup.privacy_url || '#';

    const appEl = document.getElementById('app');
    if (!appEl) { console.error('[MintPage] #app not found'); window.hideLoading(); return; }
    appEl.innerHTML = `
      <!-- SCREEN: LANDING -->
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
                </div>
                <div class="poap-artwork">
                  <img src="${artworkSrc}" alt="POAP Artwork" class="artwork-image">
                </div>
                <div class="poap-info">
                  <h2 class="poap-title">${detailsTitle}</h2>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <p id="cta-error" class="cta-error" style="display:none;"></p>
          <button id="cta-get-card" class="cta-button" disabled>
            <span class="cta-text">Checking availability...</span>
            <span class="cta-spinner"></span>
          </button>

          <!-- Accordion toggle -->
          <button id="toggle-details" class="toggle-details">
            <span id="toggle-text">Show Details</span>
            <svg id="toggle-chevron" class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <!-- Accordion panel -->
          <div id="details-panel" class="details-panel">
            <div class="details-content">
              <h3 id="details-heading" class="details-heading">${detailsTitle}</h3>
              ${this.renderDateLocationSection(cms)}
              <p id="details-text" class="details-text">${detailsText}</p>
            </div>
          </div>

          <!-- Footer -->
          <footer class="mint-footer">
            <div class="footer-top">
              <div class="footer-left">
                <img src="${raw.footer_logo_url || footerLogoSrc}" alt="Footer Logo" class="footer-logo-img">
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

      <!-- FORM BOTTOM SHEET -->
      <div id="form-overlay" class="overlay" style="display:none;">
        <div id="form-sheet" class="bottom-sheet">
          <h2 class="form-title" style="font-family:var(--font-title)">Get your collectible</h2>
          <p class="form-subtitle" style="font-family:var(--font-body)">To secure your collectible we need a few details</p>
          <form id="claim-form" autocomplete="off">
            ${this.renderMainAddressField()}

            ${this.renderCustomFields()}

            <p class="form-terms">By clicking on the button below you agree with our
              <a href="${termsUrl}" target="_blank">Terms &amp; Conditions</a> and <a href="${privacyUrl}" target="_blank">Privacy Policy</a>
            </p>
            <p class="form-error" style="display:none; font-size:13px; margin-bottom:12px; text-align:center;"></p>
            <button type="submit" class="cta-button cta-form">
              <span class="cta-text">${this.mintFormButtonText}</span>
              <span class="cta-spinner" style="display:none;"></span>
            </button>
          </form>
        </div>
      </div>
    `;

    // Inject HTML — hideLoading() is called by runAvailabilityFlow once we know
    // whether to stay on mint (available/error) or redirect (claimed).
    const screenEl = document.getElementById('screen-landing');
    if (screenEl) screenEl.classList.add('visible');

    try {
      this.init(mintId, collection);
    } catch (err) {
      console.error('[MintPage] init error:', err);
      document.getElementById('app').innerHTML =
        `<p style="padding:2rem;text-align:center;font-family:sans-serif;color:red">Init error: ${err.message}</p>`;
      window.hideLoading();
    }
    // ← no hideLoading() here
  },

  // ── Wire up events and run availability flow ──
  init(mintId, collection) {
    const ctaGetCard   = document.getElementById('cta-get-card');
    const ctaText      = ctaGetCard.querySelector('.cta-text');
    const ctaSpinner   = ctaGetCard.querySelector('.cta-spinner');
    const ctaError     = document.getElementById('cta-error');
    const toggleBtn    = document.getElementById('toggle-details');
    const toggleText   = document.getElementById('toggle-text');
    const toggleChevron = document.getElementById('toggle-chevron');
    const detailsPanel = document.getElementById('details-panel');
    const formOverlay  = document.getElementById('form-overlay');
    const formSheet    = document.getElementById('form-sheet');
    const claimForm    = document.getElementById('claim-form');

    const SUPABASE_URL       = window.App.supabaseUrl;
    const COLLECTION_DROP_ID = window.App.config?.collection_drop_id || '';
    const ERROR_COLOR        = window.App.errorColor;

    // ── Helpers ──
    function showCtaError(msg) {
      window.hideLoading(); // stay on mint, reveal page with error
      ctaGetCard.disabled = true;
      ctaText.textContent = window.MintPage.mintPageButtonText || 'Get Collectible';
      ctaSpinner.style.display = 'none';
      ctaGetCard.style.opacity = '0.4';
      ctaError.textContent = msg;
      ctaError.style.color = ERROR_COLOR;
      ctaError.style.display = 'block';
    }

    function openForm() {
      formOverlay.style.display = 'block';
      formOverlay.offsetHeight; // force reflow
      formOverlay.classList.add('visible');
      formSheet.classList.add('open');
    }

    function closeForm() {
      formSheet.classList.remove('open');
      formOverlay.classList.remove('visible');
      setTimeout(() => { formOverlay.style.display = 'none'; }, 350);
    }

    // ── Accordion ──
    toggleBtn.addEventListener('click', () => {
      const isOpen = detailsPanel.classList.toggle('open');
      toggleChevron.classList.toggle('open', isOpen);
      toggleText.textContent = isOpen ? 'Hide Details' : 'Show Details';
    });

    // ── CTA click → open form ──
    ctaGetCard.addEventListener('click', () => {
      if (!ctaGetCard.disabled) openForm();
    });

    // ── Close form on overlay click ──
    formOverlay.addEventListener('click', (e) => {
      if (e.target === formOverlay) closeForm();
    });

    // ── Hybrid address detection for wallet fields ──
    const addressField = claimForm.querySelector('input[name="wallet_or_email"]');
    if (addressField) {
      const validateAddress = () => {
        const addressType = this.detectAddressType(addressField.value);
        const mintingType = window.App.data?.setup?.minting_type || 'all';
        const isWalletType = addressType === 'wallet' || addressType === 'ens';
        const isValidFormat = this.isValidAddressFormat(addressType, mintingType);
        const errorEl = document.getElementById('address-format-error');
        
        // Show/hide wallet fields
        this.toggleWalletFields(isWalletType);
        
        // Show/hide format error (only if field has enough content and format is invalid)
        const trimmedValue = addressField.value.trim();
        if (trimmedValue.length > 3 && !isValidFormat) {
          if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.style.opacity = '1';
          }
        } else {
          if (errorEl) {
            errorEl.style.opacity = '0';
            setTimeout(() => {
              errorEl.style.display = 'none';
            }, 200);
          }
        }
        
        console.log('[MintPage] Address type detected:', addressType, 'Valid format:', isValidFormat, 'Wallet fields visible:', isWalletType);
      };

      // Initial state: hide wallet fields
      this.toggleWalletFields(false);

      // onBlur: Always check when field loses focus  
      addressField.addEventListener('blur', validateAddress);

      // onInput: Debounced validation during typing
      const debouncedValidation = this.debounce(validateAddress, 800);
      addressField.addEventListener('input', debouncedValidation);

      // onPaste: Immediate validation after paste
      addressField.addEventListener('paste', () => {
        setTimeout(validateAddress, 100); // Small delay to let paste complete
      });
    }

    // ── Form submit ──
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn       = claimForm.querySelector('.cta-button');
      const btnText   = btn.querySelector('.cta-text');
      const btnSpinner = btn.querySelector('.cta-spinner');
      const formError = claimForm.querySelector('.form-error');
      const walletOrEmail = claimForm.querySelector('input[name="wallet_or_email"]')?.value.trim() || '';

      if (!walletOrEmail) {
        if (formError) { formError.textContent = 'Please enter your wallet address, ENS or email'; formError.style.color = ERROR_COLOR; formError.style.display = 'block'; }
        return;
      }
      if (!mintId.value) {
        if (formError) { formError.textContent = 'No mint code found in URL'; formError.style.color = ERROR_COLOR; formError.style.display = 'block'; }
        return;
      }

      if (formError) { formError.textContent = ''; formError.style.display = 'none'; }
      btn.disabled = true;
      btnText.textContent = 'Collecting...';
      btnSpinner.style.display = 'inline-block';

      try {
        // Step 1: Claim the POAP
        let claimUrl, claimBody;
        if (mintId.type === 'mintcode') {
          claimUrl = `${SUPABASE_URL}/functions/v1/claim-mint-code`;
          claimBody = { address: walletOrEmail, qr_hash: mintId.value, collection_drop_id: COLLECTION_DROP_ID };
        } else if (mintId.type === 'slug') {
          claimUrl = `${SUPABASE_URL}/functions/v1/claim-from-slug`;
          claimBody = { address: walletOrEmail, slug: mintId.value, collection_drop_id: COLLECTION_DROP_ID };
        }

        const res  = await fetch(claimUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(claimBody) });
        const data = await res.json();
        console.log('[Mint] Claim result:', data);

        if (data.success) {
          console.log('[Mint] Claim successful, now saving custom field responses...');
          
          // Step 2: Save custom field responses
          try {
            const customFieldResponses = {};
            (window.App.data?.customFields || []).forEach(field => {
              const el = claimForm.querySelector(`[name="cf_${field.field_name}"]`);
              if (el) {
                const value = field.field_type === 'checkbox' ? String(el.checked) : el.value;
                if (value && value.trim() !== '') {
                  customFieldResponses[field.definition_id] = value;
                }
              }
            });

            if (Object.keys(customFieldResponses).length > 0) {
              const cfSaveBody = {
                wallet_or_email: walletOrEmail,
                collection_id: window.App.data?.ids?.collection_id || '1d4bca0e-fbbc-4af2-8a12-cced5d028c67',
                drop_id: data.drop_id,
                responses: customFieldResponses
              };
              
              console.log('[Mint] Saving CF responses:', cfSaveBody);
              const cfRes = await fetch(`${SUPABASE_URL}/functions/v1/save-custom-field-responses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfSaveBody)
              });
              
              const cfData = await cfRes.json();
              console.log('[Mint] CF save result:', cfData);
              
              if (!cfData.success) {
                console.warn('[Mint] CF save failed but continuing:', cfData);
              }
            }
          } catch (cfErr) {
            console.error('[Mint] CF save error (non-critical):', cfErr);
            // Continue with navigation even if CF save fails
          }

          closeForm();
          // Navigate to mycollectible — pass claim data in state so mycollectible
          // doesn't need to re-fetch check-mint-code-status (avoids timing issues)
          const claimedCode = data.code || mintId.value;
          const claimState = {
            claimed: true,
            claimed_address: walletOrEmail,
            claimed_on: data.claimed_on || new Date().toISOString(),
          };
          setTimeout(() => {
            window.navigateTo(collection, 'mycollectible', claimedCode, claimState);
          }, 400);
        } else {
          let msg = 'Something went wrong. Please try again.';
          if (data.message === 'already_claimed_by_you') msg = 'You already claimed this card!';
          else if (data.message === 'already_claimed')  msg = 'This code has already been claimed';
          else if (data.message === 'code_not_found')   msg = 'Invalid code';
          else if (data.message === 'drop_not_found')   msg = 'Drop not found for this slug';
          else if (data.message === 'no_codes_available') msg = 'No more cards available';
          else if (data.message === 'rate_limit_exceeded') msg = 'Too many attempts. Please wait a moment.';
          else if (data.message) msg = data.message;
          if (formError) { formError.textContent = msg; formError.style.color = ERROR_COLOR; formError.style.display = 'block'; }
        }
      } catch (err) {
        console.error('[Mint] Claim failed:', err);
        if (formError) { formError.textContent = 'Network error. Please check your connection.'; formError.style.color = ERROR_COLOR; formError.style.display = 'block'; }
      } finally {
        btnText.textContent = window.MintPage.mintFormButtonText || 'Collect';
        btnSpinner.style.display = 'none';
        btn.disabled = false;
      }
    });

    // ── Availability flow ── 
    // Run immediately - if splash is active, button loading happens behind it
    // When splash exits naturally, user will see the button in correct state
    this.runAvailabilityFlow(mintId, collection, { ctaGetCard, ctaText, ctaSpinner, ctaError, showCtaError, SUPABASE_URL });
  },

  async runAvailabilityFlow(mintId, collection, { ctaGetCard, ctaText, ctaSpinner, ctaError, showCtaError, SUPABASE_URL }) {
    ctaGetCard.disabled = true;
    ctaText.textContent = 'Checking availability...';
    ctaSpinner.style.display = 'inline-block';
    ctaError.textContent = '';
    ctaError.style.display = 'none';

    if (mintId.type === 'none' || mintId.type === 'invalid') {
      showCtaError('No mint code or slug found to claim this drop');
      return;
    }

    // ── MINTCODE flow ──
    if (mintId.type === 'mintcode') {
      try {
        const statusRes = await fetch(`${SUPABASE_URL}/functions/v1/check-mint-code-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_hash: mintId.value }),
        });
        const status = await statusRes.json();
        console.log('[Mint] Code status:', status);

        if (!status.exists)     { showCtaError('Invalid code'); return; }
        if (status.blacklisted) { showCtaError('This code is not available'); return; }
        // claimed check BEFORE is_reserved — a claimed code can have is_reserved: true
        if (status.claimed) {
          window.navigateTo(collection, 'mycollectible', mintId.value, {
            claimed: true,
            claimed_address: status.claimed_address || null,
            claimed_on: status.claimed_on || null,
          });
          return; // no hideLoading — mycollectible will call it
        }
        if (status.is_reserved) { showCtaError('This code is being processed'); return; }
      } catch (err) {
        console.error('[Mint] Status check failed:', err);
        // Graceful degradation: continue to availability check
      }

      // Drop-level availability
      try {
        const availRes = await fetch(`${SUPABASE_URL}/functions/v1/collectible-availability?qr_hash=${mintId.value}`);
        const avail = await availRes.json();
        console.log('[Mint] Availability:', avail);

        if (avail.success && avail.availability?.can_claim) {
          window.hideLoading(); // stay on mint, CTA ready
          ctaGetCard.disabled = false;
          ctaText.textContent = window.MintPage.mintPageButtonText || 'Get Collectible';
          ctaSpinner.style.display = 'none';
          ctaGetCard.style.opacity = '1';
          return;
        }
        const reason = avail.availability?.reason || avail.message || 'unavailable';
        if (reason === 'not_started') showCtaError('This collectible is not available yet');
        else if (reason === 'expired')  showCtaError('This collectible has expired');
        else if (reason === 'sold_out') showCtaError('No more collectibles available');
        else showCtaError('This collectible is not available');
      } catch (err) {
        console.error('[Mint] Availability check failed:', err);
        window.hideLoading();
        ctaGetCard.disabled = false;
        ctaText.textContent = window.MintPage.mintPageButtonText || 'Get Collectible';
        ctaSpinner.style.display = 'none';
        ctaGetCard.style.opacity = '1';
      }
      return;
    }

    // ── SLUG flow ──
    if (mintId.type === 'slug') {
      try {
        const availRes = await fetch(`${SUPABASE_URL}/functions/v1/collectible-availability?slug=${mintId.value}`);
        const avail = await availRes.json();
        console.log('[Mint] Availability (slug):', avail);

        if (avail.success && avail.availability?.can_claim) {
          window.hideLoading(); // stay on mint, CTA ready
          ctaGetCard.disabled = false;
          ctaText.textContent = window.MintPage.mintPageButtonText || 'Get Collectible';
          ctaSpinner.style.display = 'none';
          ctaGetCard.style.opacity = '1';
          return;
        }
        const reason = avail.availability?.reason || avail.message || 'unavailable';
        if (reason === 'not_started')            showCtaError('This collectible is not available yet');
        else if (reason === 'expired')           showCtaError('This collectible has expired');
        else if (reason === 'sold_out')          showCtaError('No more collectibles available');
        else if (reason === 'missing_or_invalid_input') showCtaError('Invalid slug');
        else if (reason === 'drop_not_found')   showCtaError('Drop not found for this slug');
        else showCtaError('This collectible is not available');
      } catch (err) {
        console.error('[Mint] Availability check failed (slug):', err);
        window.hideLoading();
        ctaGetCard.disabled = false;
        ctaText.textContent = window.MintPage.mintPageButtonText || 'Get Collectible';
        ctaSpinner.style.display = 'none';
        ctaGetCard.style.opacity = '1';
      }
    }
  },
};
