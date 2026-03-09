// ===== Collectible Minter App — SPA Router =====
// URL format: /[collection]/[page]/[code]
// Examples:
//   /collection-name/mint/code123
//   /collection-name/mycollectible/code123

const SUPABASE_URL = 'https://xkfwlcyntfcfouvgmdvj.supabase.co';

// Per-collection static config (collection_drop_id for claiming)
const COLLECTION_CONFIG = {
  'bpi-networking': {
    collection_drop_id: '7ba69e11-5a8c-453f-98c4-09adb2fbe749',
  },
};

// ===== Global App State =====
window.App = {
  supabaseUrl: SUPABASE_URL,
  errorColor: '#d32f2f',
  route: null,    // { collection, page, code }
  data: null,     // get_template_setup response
  config: null,   // COLLECTION_CONFIG entry for current collection
};

// ===== Route Parsing =====
function parseRoute() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return {
    collection: parts[0] || null,
    page: parts[1] || null,   // 'mint' | 'mycollectible'
    code: parts[2] || null,
  };
}

// ===== Navigation =====
// Splash is first-load only. Transitions just swap #app content with a quick fade.
window.navigateTo = async function (collection, page, code, state) {
  const path = code
    ? `/${collection}/${page}/${code}`
    : `/${collection}/${page}`;
  window.history.pushState(state || {}, '', path);
  window.App.route = parseRoute();

  // Fade out #app, swap content, fade in
  const app = document.getElementById('app');
  if (app) {
    app.style.transition = 'opacity 0.15s ease';
    app.style.opacity = '0';
    await new Promise(r => setTimeout(r, 150));
  }

  await renderRoute();

  if (app) {
    app.style.opacity = '1';
  }
};

// ===== Loading Screen =====
function showLoading() {
  const ls = document.getElementById('loading-screen');
  if (!ls) return;
  ls.style.opacity = '1';
  ls.style.visibility = 'visible';
  ls.classList.remove('hide');
}

window.hideLoading = function () {
  const ls = document.getElementById('loading-screen');
  if (ls) ls.classList.add('hide');
};

// ===== Theme =====
function applyTheme(raw) {
  const root = document.documentElement;
  const ls = document.getElementById('loading-screen');
  if (raw.page_bg_color) {
    root.style.setProperty('--page-bg-color', raw.page_bg_color);
    if (ls) ls.style.backgroundColor = raw.page_bg_color;
  }
  if (raw.page_bg_image_url) {
    root.style.setProperty('--page-bg-image', `url("${raw.page_bg_image_url}")`);
  }
  if (raw.body_text_color) root.style.setProperty('--body-text-color', raw.body_text_color);
  if (raw.body_bg_color)   root.style.setProperty('--body-bg-color',   raw.body_bg_color);
  if (raw.button_bg_color)   root.style.setProperty('--btn-bg-color',   raw.button_bg_color);
  if (raw.button_text_color) root.style.setProperty('--btn-text-color', raw.button_text_color);
  if (raw.footer_text_color) root.style.setProperty('--footer-text-color', raw.footer_text_color);
  if (raw.highlight_color) root.style.setProperty('--highlight-color', raw.highlight_color);
}

function applyFonts(fonts) {
  function loadFont(font) {
    if (!font) return;
    if (font.needsLink && font.url) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font.url;
      document.head.appendChild(link);
    }
  }
  if (fonts.title) {
    loadFont(fonts.title);
    document.documentElement.style.setProperty('--font-title', `'${fonts.title.family}', sans-serif`);
  }
  if (fonts.body) {
    loadFont(fonts.body);
    document.documentElement.style.setProperty('--font-body', `'${fonts.body.family}', sans-serif`);
  }
}

// ===== Route Renderer (async — awaits page renders) =====
async function renderRoute() {
  const { collection, page } = window.App.route;

  if (!collection) {
    document.getElementById('app').innerHTML =
      '<p style="padding:2rem;text-align:center;font-family:sans-serif">Invalid URL</p>';
    window.hideLoading();
    return;
  }

  try {
    if (page === 'mycollectible') {
      if (window.MycollectiblePage) {
        await window.MycollectiblePage.render();
      } else {
        console.error('MycollectiblePage not loaded');
        window.hideLoading();
      }
    } else if (page === 'error') {
      if (window.ErrorPage) {
        window.ErrorPage.render();
      } else {
        console.error('ErrorPage not loaded');
        window.hideLoading();
      }
    } else {
      // Default: mint page (handles 'mint' and undefined page)
      if (window.MintPage) {
        window.MintPage.render();
      } else {
        console.error('MintPage not loaded');
        window.hideLoading();
      }
    }
  } catch (err) {
    console.error('[Router] renderRoute error:', err);
    document.getElementById('app').innerHTML =
      `<p style="padding:2rem;text-align:center;font-family:sans-serif;color:red">Error: ${err.message}</p>`;
    window.hideLoading();
  }
}

// transitionAndRender removed — navigateTo() calls renderRoute() directly

// ===== Progressive Loading =====
async function initSplash(collection, code) {
  const splashEl = document.getElementById('loading-screen');
  const logoEl = document.getElementById('splash-logo');
  const spinnerEl = document.querySelector('.loader-spinner');
  
  if (!collection) {
    renderRoute();
    return;
  }

  try {
    // Step 1: get-bg for fast splash branding + validation
    console.log('[Router] Loading background...');
    const bgRes = await fetch(`${SUPABASE_URL}/functions/v1/get-bg?collection=${collection}`);
    const bgData = await bgRes.json();
    
    if (!bgData.exists) {
      console.error('[Router] Collection not found:', collection);
      window.App.data = { success: false, error: 'Collection not found' };
      renderRoute();
      return;
    }

    // Apply background color immediately (splash + CSS variables for error page)
    if (bgData.background_color) {
      splashEl.style.backgroundColor = bgData.background_color;
      // Also set CSS variable so error page uses correct collection color
      document.documentElement.style.setProperty('--page-bg-color', bgData.background_color);
    }

    // Show logo if available
    if (bgData.logo_url) {
      logoEl.src = bgData.logo_url;
      logoEl.style.display = 'block';
      logoEl.onload = () => logoEl.classList.add('visible');
      
      // Store get-bg data globally for error page fallback
      window.App.bgData = bgData;
    }

    // Color the spinner with highlight color (if we have it from bgData)
    // Note: get-bg doesn't return highlight_color, so we'll wait for template_setup
    
  } catch (err) {
    console.error('[Router] get-bg failed:', err);
  }

  try {
    // Step 2: get_template_setup for full theme + content + validation
    console.log('[Router] Loading template setup...');
    
    let setupData;
    if (code) {
      // Use BOTH collection and code for validation + template setup
      const setupRes = await fetch(`${SUPABASE_URL}/functions/v1/get_template_setup?collection=${collection}&code=${code}`);
      setupData = await setupRes.json();
      
      // Backend validation: Check if we have usable data (theme, cms, etc.)
      if (!setupData.success && (!setupData.theme && !setupData.cms)) {
        console.error('[Router] Backend validation failed with no usable data:', setupData);
        // Load collection theme for proper error page branding
        try {
          const collectionSetupRes = await fetch(`${SUPABASE_URL}/functions/v1/get_template_setup?collection=${collection}`);
          const collectionSetupData = await collectionSetupRes.json();
          if (collectionSetupData.success) {
            // Apply collection theme for error page
            applyTheme(collectionSetupData.theme?.raw || {});
            applyFonts(collectionSetupData.fonts || {});
            // Store collection setup data + backend error for error page
            window.App.data = collectionSetupData;
            window.App.errorData = setupData; // Backend error/message
          }
        } catch (err) {
          console.error('[Router] Failed to load collection theme for error page:', err);
        }
        
        setTimeout(() => {
          window.navigateTo(collection, 'error');
        }, 100);
        return;
      }
    } else {
      // No code - use collection only (for error page or future collection-only routes)
      const setupRes = await fetch(`${SUPABASE_URL}/functions/v1/get_template_setup?collection=${collection}`);
      setupData = await setupRes.json();
    }
    
    window.App.data = setupData;
    console.log('[Router] Template setup:', setupData);
    
    // Apply theme only after validation passes
    if (setupData.success) {
      applyTheme(setupData.theme?.raw || {});
      applyFonts(setupData.fonts || {});
      
      // Update spinner color with highlight
      if (setupData.theme?.raw?.highlight_color) {
        spinnerEl.style.borderTopColor = setupData.theme.raw.highlight_color;
        spinnerEl.classList.add('branded');
      }
    }
  } catch (err) {
    console.error('[Router] Template setup failed:', err);
    window.App.data = { success: false };
    
    // Load collection theme for proper error page branding
    try {
      const collectionSetupRes = await fetch(`${SUPABASE_URL}/functions/v1/get_template_setup?collection=${collection}`);
      const collectionSetupData = await collectionSetupRes.json();
      if (collectionSetupData.success) {
        // Apply collection theme for error page
        applyTheme(collectionSetupData.theme?.raw || {});
        applyFonts(collectionSetupData.fonts || {});
        // Store collection setup data for error page
        window.App.data = collectionSetupData;
      }
    } catch (fallbackErr) {
      console.error('[Router] Failed to load collection theme for error page:', fallbackErr);
    }
    
    setTimeout(() => {
      window.navigateTo(collection, 'error');
    }, 100);
    return;
  }

  // Step 3: Render page content behind splash
  renderRoute();
  
  // Step 4: Exit animation after a short delay (let content render)
  setTimeout(() => {
    exitSplash();
  }, 600);
}

function exitSplash() {
  const splashEl = document.getElementById('loading-screen');
  const logoEl = document.getElementById('splash-logo');
  
  // Logo flies straight up to header position (center X, top Y)
  const targetX = 0;  // Stay centered horizontally 
  const targetY = -window.innerHeight/2 + 80;  // Move to top
  
  // Set CSS custom properties for logo animation
  logoEl.style.setProperty('--logo-target-x', `${targetX}px`);
  logoEl.style.setProperty('--logo-target-y', `${targetY}px`);
  
  // Start logo fly animation
  if (logoEl.classList.contains('visible')) {
    logoEl.classList.add('fly-to-header');
  }
  
  // Hide splash after animation
  setTimeout(() => {
    splashEl.classList.add('hide');
  }, 200);
}

// ===== Init =====
async function init() {
  window.App.route = parseRoute();
  const { collection, code } = window.App.route;
  window.App.config = COLLECTION_CONFIG[collection] || {};

  await initSplash(collection, code);
}

// ===== Back/Forward Navigation =====
window.addEventListener('popstate', async () => {
  window.App.route = parseRoute();
  const app = document.getElementById('app');
  if (app) { app.style.opacity = '0'; await new Promise(r => setTimeout(r, 150)); }
  await renderRoute();
  if (app) { app.style.opacity = '1'; }
});

window.addEventListener('load', init);
