// ===== Configuration =====
const SUPABASE_URL = 'https://xkfwlcyntfcfouvgmdvj.supabase.co';
const COLLECTION_SLUG = 'bpi-networking';
const COLLECTION_DROP_ID = '7ba69e11-5a8c-453f-98c4-09adb2fbe749';
const ERROR_COLOR = '#d32f2f';

// ===== Resolve mint identifier from URL =====
// Supports: /mint/XXXXXX (path) or ?mintcode=XXXXXX (query param fallback)
function resolveMintIdentifier() {
  const pathMatch = window.location.pathname.match(/\/mint\/([^/]+)/);
  const raw = pathMatch ? pathMatch[1] : new URLSearchParams(window.location.search).get('mintcode');

  if (!raw || raw.trim().length === 0) {
    return { type: 'none', value: null };
  }

  const value = raw.trim();

  // 6 alphanumeric chars = mintcode (qr_hash)
  if (/^[a-zA-Z0-9]{6}$/.test(value)) {
    return { type: 'mintcode', value };
  }

  // >6 chars, valid slug format (alphanumeric + hyphens) = slug
  if (/^[a-zA-Z0-9-]{7,100}$/.test(value)) {
    return { type: 'slug', value };
  }

  return { type: 'invalid', value };
}

const mintId = resolveMintIdentifier();
console.log('Mint identifier:', mintId);

// ===== Elements =====
const loadingScreen = document.getElementById('loading-screen');
const screenLanding = document.getElementById('screen-landing');
const screenConfirmation = document.getElementById('screen-confirmation');
const ctaGetCard = document.getElementById('cta-get-card');
const ctaText = ctaGetCard.querySelector('.cta-text');
const ctaSpinner = ctaGetCard.querySelector('.cta-spinner');
const ctaError = document.getElementById('cta-error');
const toggleBtn = document.getElementById('toggle-details');
const toggleText = document.getElementById('toggle-text');
const toggleChevron = document.getElementById('toggle-chevron');
const detailsPanel = document.getElementById('details-panel');
const formOverlay = document.getElementById('form-overlay');
const formSheet = document.getElementById('form-sheet');
const claimForm = document.getElementById('claim-form');

// ===== Helper: show error on CTA =====
function showCtaError(msg) {
  ctaGetCard.disabled = true;
  ctaText.textContent = 'Get my Digital Card';
  ctaSpinner.style.display = 'none';
  ctaGetCard.style.opacity = '0.4';
  ctaError.textContent = msg;
  ctaError.style.color = ERROR_COLOR;
  ctaError.style.display = 'block';
}

// ===== Helper: show confirmation screen =====
function showConfirmation() {
  screenLanding.classList.remove('active');
  screenLanding.style.display = 'none';
  screenConfirmation.style.display = 'block';
  window.scrollTo(0, 0);
}

// ===== Fetch backend data and apply theme =====
async function initFromBackend() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get_template_setup?collection=${COLLECTION_SLUG}`);
    const data = await res.json();

    if (!data.success) {
      console.error('Backend error:', data.error);
      showPage();
      return;
    }

    console.log('Backend data loaded:', data);
    applyTheme(data.theme?.raw || {});
    applyFonts(data.fonts || {});
    applyAssets(data.theme?.raw || {});
    applyCms(data.cms || {});
  } catch (err) {
    console.error('Failed to fetch backend data:', err);
  }

  showPage();
  runAvailabilityFlow();
}

// ===== Availability flow =====
async function runAvailabilityFlow() {
  // CTA starts in checking state
  ctaGetCard.disabled = true;
  ctaText.textContent = 'Checking availability...';
  ctaSpinner.style.display = 'inline-block';
  ctaError.textContent = '';
  ctaError.style.display = 'none';

  // No code/slug → error without calling any edge
  if (mintId.type === 'none' || mintId.type === 'invalid') {
    showCtaError('No mint code or slug found to claim this drop');
    return;
  }

  // ── MINTCODE flow: check-mint-code-status first, then availability ──
  if (mintId.type === 'mintcode') {
    try {
      const statusRes = await fetch(`${SUPABASE_URL}/functions/v1/check-mint-code-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_hash: mintId.value }),
      });
      const status = await statusRes.json();
      console.log('Mint code status:', status);

      // Code doesn't exist
      if (!status.exists) {
        showCtaError('Invalid code');
        return;
      }

      // Blacklisted
      if (status.blacklisted) {
        showCtaError('This code is not available');
        return;
      }

      // Reserved (being processed)
      if (status.is_reserved) {
        showCtaError('This code is being processed');
        return;
      }

      // Already claimed → skip to confirmation
      if (status.claimed) {
        ctaSpinner.style.display = 'none';
        showConfirmation();
        return;
      }

      // Code is available → check drop-level availability
    } catch (err) {
      console.error('Mint code status check failed:', err);
      // Graceful degradation: continue to availability check
    }

    // Drop-level availability check
    try {
      const availRes = await fetch(`${SUPABASE_URL}/functions/v1/collectible-availability?qr_hash=${mintId.value}`);
      const avail = await availRes.json();
      console.log('Availability:', avail);

      if (avail.success && avail.availability?.can_claim) {
        // All good — activate button
        ctaGetCard.disabled = false;
        ctaText.textContent = 'Get my Digital Card';
        ctaSpinner.style.display = 'none';
        ctaGetCard.style.opacity = '1';
        return;
      }

      // Drop-level error
      const reason = avail.availability?.reason || avail.message || 'unavailable';
      if (reason === 'not_started') showCtaError('This collectible is not available yet');
      else if (reason === 'expired') showCtaError('This collectible has expired');
      else if (reason === 'sold_out') showCtaError('No more collectibles available');
      else showCtaError('This collectible is not available');
      return;
    } catch (err) {
      console.error('Availability check failed:', err);
      // Graceful degradation: enable button anyway
      ctaGetCard.disabled = false;
      ctaText.textContent = 'Get my Digital Card';
      ctaSpinner.style.display = 'none';
      ctaGetCard.style.opacity = '1';
    }

    return;
  }

  // ── SLUG flow: availability check only ──
  if (mintId.type === 'slug') {
    try {
      const availRes = await fetch(`${SUPABASE_URL}/functions/v1/collectible-availability?slug=${mintId.value}`);
      const avail = await availRes.json();
      console.log('Availability (slug):', avail);

      if (avail.success && avail.availability?.can_claim) {
        ctaGetCard.disabled = false;
        ctaText.textContent = 'Get my Digital Card';
        ctaSpinner.style.display = 'none';
        ctaGetCard.style.opacity = '1';
        return;
      }

      const reason = avail.availability?.reason || avail.message || 'unavailable';
      if (reason === 'not_started') showCtaError('This collectible is not available yet');
      else if (reason === 'expired') showCtaError('This collectible has expired');
      else if (reason === 'sold_out') showCtaError('No more collectibles available');
      else if (reason === 'missing_or_invalid_input') showCtaError('Invalid slug');
      else if (reason === 'drop_not_found') showCtaError('Drop not found for this slug');
      else showCtaError('This collectible is not available');
    } catch (err) {
      console.error('Availability check failed (slug):', err);
      ctaGetCard.disabled = false;
      ctaText.textContent = 'Get my Digital Card';
      ctaSpinner.style.display = 'none';
      ctaGetCard.style.opacity = '1';
    }
  }
}

// ===== Theme / Fonts / Assets / CMS =====
function applyTheme(raw) {
  const root = document.documentElement;
  if (raw.page_bg_color) {
    root.style.setProperty('--page-bg-color', raw.page_bg_color);
    loadingScreen.style.backgroundColor = raw.page_bg_color;
  }
  if (raw.body_text_color) root.style.setProperty('--body-text-color', raw.body_text_color);
  if (raw.body_bg_color) root.style.setProperty('--body-bg-color', raw.body_bg_color);
  if (raw.button_bg_color) root.style.setProperty('--btn-bg-color', raw.button_bg_color);
  if (raw.button_text_color) root.style.setProperty('--btn-text-color', raw.button_text_color);
  if (raw.footer_text_color) root.style.setProperty('--footer-text-color', raw.footer_text_color);
}

function applyFonts(fonts) {
  if (fonts.title) {
    if (fonts.title.needsLink && fonts.title.url) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fonts.title.url;
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty('--font-title', `'${fonts.title.family}', sans-serif`);
  }
  if (fonts.body) {
    if (fonts.body.needsLink && fonts.body.url) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fonts.body.url;
      document.head.appendChild(link);
    }
    document.documentElement.style.setProperty('--font-body', `'${fonts.body.family}', sans-serif`);
  }
}

function applyAssets(raw) {
  if (raw.page_bg_image_url) {
    document.documentElement.style.setProperty('--page-bg-image', `url('${raw.page_bg_image_url}')`);
  }
  if (raw.header_logo_url) {
    const logo = document.getElementById('profile-logo');
    if (logo) logo.src = raw.header_logo_url;
  }
  if (raw.footer_logo_url) {
    document.querySelectorAll('.footer-logo').forEach(el => {
      el.src = raw.footer_logo_url;
    });
  }
}

function applyCms(cms) {
  if (cms.title) {
    const detailsHeading = document.getElementById('details-heading');
    if (detailsHeading) detailsHeading.textContent = cms.title;
    const contactHeading = document.getElementById('contact-heading');
    if (contactHeading) contactHeading.textContent = cms.title;
  }
  if (cms.available_description) {
    const detailsText = document.getElementById('details-text');
    if (detailsText) detailsText.textContent = cms.available_description;
  }
  if (cms.main_image_url) {
    const souvenirArt = document.getElementById('souvenir-artwork');
    if (souvenirArt) souvenirArt.src = cms.main_image_url;
  }
  if (cms.location) {
    const locationEl = document.getElementById('confirm-location');
    if (locationEl) locationEl.textContent = cms.location;
  }
}

function showPage() {
  loadingScreen.classList.add('hide');
  screenLanding.classList.add('visible');
}

// ===== Page Load =====
window.addEventListener('load', () => {
  initFromBackend();
});

// ===== Toggle Details Accordion =====
toggleBtn.addEventListener('click', () => {
  const isOpen = detailsPanel.classList.toggle('open');
  toggleChevron.classList.toggle('open', isOpen);
  toggleText.textContent = isOpen ? 'Hide Details' : 'Show Details';
});

// ===== CTA: Open form =====
ctaGetCard.addEventListener('click', () => {
  if (ctaGetCard.disabled) return;
  openForm();
});

// ===== Form Bottom Sheet =====
function openForm() {
  formOverlay.style.display = 'block';
  formOverlay.offsetHeight;
  formOverlay.classList.add('visible');
  formSheet.classList.add('open');
}

function closeForm() {
  formSheet.classList.remove('open');
  formOverlay.classList.remove('visible');
  setTimeout(() => {
    formOverlay.style.display = 'none';
  }, 350);
}

formOverlay.addEventListener('click', (e) => {
  if (e.target === formOverlay) {
    closeForm();
  }
});

// ===== Form Submit: Real claim flow =====
claimForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = claimForm.querySelector('.cta-button');
  const text = btn.querySelector('.cta-text');
  const spinner = btn.querySelector('.cta-spinner');
  const formError = claimForm.querySelector('.form-error');

  const emailInput = claimForm.querySelector('input[type="email"]');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    if (formError) { formError.textContent = 'Please enter your email'; formError.style.color = ERROR_COLOR; formError.style.display = 'block'; }
    return;
  }

  if (!mintId.value) {
    if (formError) { formError.textContent = 'No mint code found in URL'; formError.style.color = ERROR_COLOR; formError.style.display = 'block'; }
    return;
  }

  if (formError) { formError.textContent = ''; formError.style.display = 'none'; }

  btn.disabled = true;
  text.textContent = 'Creating your card...';
  spinner.style.display = 'inline-block';

  try {
    let claimUrl, claimBody;

    if (mintId.type === 'mintcode') {
      claimUrl = `${SUPABASE_URL}/functions/v1/claim-mint-code`;
      claimBody = {
        address: email,
        qr_hash: mintId.value,
        collection_drop_id: COLLECTION_DROP_ID,
      };
    } else if (mintId.type === 'slug') {
      claimUrl = `${SUPABASE_URL}/functions/v1/claim-from-slug`;
      claimBody = {
        address: email,
        slug: mintId.value,
        collection_drop_id: COLLECTION_DROP_ID,
      };
    }

    const res = await fetch(claimUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claimBody),
    });

    const data = await res.json();
    console.log('Claim result:', data);

    if (data.success) {
      closeForm();
      setTimeout(() => {
        showConfirmation();
      }, 400);
    } else {
      let errorMsg = 'Something went wrong. Please try again.';
      if (data.message === 'already_claimed_by_you') errorMsg = 'You already claimed this card!';
      else if (data.message === 'already_claimed') errorMsg = 'This code has already been claimed';
      else if (data.message === 'code_not_found') errorMsg = 'Invalid code';
      else if (data.message === 'drop_not_found') errorMsg = 'Drop not found for this slug';
      else if (data.message === 'no_codes_available') errorMsg = 'No more cards available';
      else if (data.message === 'rate_limit_exceeded') errorMsg = 'Too many attempts. Please wait a moment.';
      else if (data.message === 'invalid_code') errorMsg = 'Invalid code format';
      else if (data.message === 'invalid_slug') errorMsg = 'Invalid slug format';
      else if (data.message) errorMsg = data.message;

      if (formError) {
        formError.textContent = errorMsg;
        formError.style.color = ERROR_COLOR;
        formError.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Claim failed:', err);
    if (formError) {
      formError.textContent = 'Network error. Please check your connection.';
      formError.style.color = ERROR_COLOR;
      formError.style.display = 'block';
    }
  } finally {
    text.textContent = 'Get my Card';
    spinner.style.display = 'none';
    btn.disabled = false;
  }
});
