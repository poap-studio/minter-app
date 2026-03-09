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
  errorData: null, // Error data for error page
  bgData: null,   // Background data for fallback
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
window.navigateTo = async function (collection, page, code, state) {
  const path = code
    ? `/${collection}/${page}/${code}`
    : collection 
      ? `/${collection}/${page}`
      : `/${page}`;
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

// ===== Route Renderer =====
async function renderRoute() {
  const { collection, page } = window.App.route;

  if (!collection && page === 'error') {
    // Global error: /error (no collection theme)
    renderGlobalError();
    return;
  }
  
  if (!collection) {
    // Invalid URL with no collection
    renderGlobalError();
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
      // Collection error: /{collection}/error (with collection theme)
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

function renderGlobalError() {
  // RESET: Clear all CSS variables from previous collections
  const root = document.documentElement;
  root.style.removeProperty('--page-bg-color');
  root.style.removeProperty('--page-bg-image');
  root.style.removeProperty('--body-text-color');
  root.style.removeProperty('--body-bg-color');
  root.style.removeProperty('--btn-bg-color');
  root.style.removeProperty('--btn-text-color');
  root.style.removeProperty('--footer-text-color');
  root.style.removeProperty('--highlight-color');
  root.style.removeProperty('--font-title');
  root.style.removeProperty('--font-body');
  
  // RESET: Clear loading screen background
  const ls = document.getElementById('loading-screen');
  if (ls) ls.style.backgroundColor = '#f5f5f5';
  
  // RESET: Clear body styles
  document.body.style.background = '#ffffff';
  document.body.style.color = '#000000';
  
  // Render clean white page with black text
  document.getElementById('app').innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: #ffffff !important; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      color: #000000 !important;
    ">
      <div style="text-align: center; padding: 2rem; color: #000000 !important;">
        <h1 style="color: #000000 !important; margin-bottom: 1rem; font-weight: 400;">Page or collection not found</h1>
        <p style="color: #000000 !important; margin-bottom: 2rem; opacity: 0.7;">Invalid URL</p>
        <a href="/" style="color: #000000 !important; text-decoration: underline;">← Go back</a>
      </div>
    </div>
  `;
  window.hideLoading();
}

// ===== Progressive Loading - SIMPLIFIED =====
async function initSplash(collection, code) {
  const splashEl = document.getElementById('loading-screen');
  const logoEl = document.getElementById('splash-logo');
  const spinnerEl = document.querySelector('.loader-spinner');
  
  // CASE 1: No collection → render global error page
  if (!collection) {
    renderRoute();
    return;
  }

  // CASE 2: Invalid page name → redirect to collection error
  const { page } = window.App.route;
  const validPages = ['mint', 'mycollectible', 'error'];
  if (page && !validPages.includes(page)) {
    console.log('[Router] Invalid page, redirecting to collection error');
    window.navigateTo(collection, 'error');
    return;
  }

  try {
    // Step 1: Validate collection exists
    console.log('[Router] Loading background...');
    const bgRes = await fetch(`${SUPABASE_URL}/functions/v1/get-bg?collection=${collection}`, {
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    const bgData = await bgRes.json();
    
    // CASE 3: Collection not found → redirect to global error (/error)
    if (!bgData.exists) {
      console.error('[Router] Collection not found:', collection);
      window.navigateTo('', 'error');
      return;
    }

    // Apply background color immediately
    if (bgData.background_color) {
      splashEl.style.backgroundColor = bgData.background_color;
      document.documentElement.style.setProperty('--page-bg-color', bgData.background_color);
    }

    // Show logo if available
    if (bgData.logo_url) {
      logoEl.src = bgData.logo_url;
      logoEl.style.display = 'block';
      logoEl.onload = () => logoEl.classList.add('visible');
      window.App.bgData = bgData;
    }
    
  } catch (err) {
    // CASE 4: get-bg network/timeout error → redirect to global error
    console.error('[Router] get-bg failed:', err);
    window.navigateTo('', 'error');
    return;
  }

  try {
    // Step 2: Get theme and content
    console.log('[Router] Loading template setup...');
    const setupRes = await fetch(`${SUPABASE_URL}/functions/v1/get_template_setup?collection=${collection}&code=${code || ''}`, {
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    const setupData = await setupRes.json();
    
    // CASE 5: get_template_setup error → redirect to collection error with error message
    if (!setupData.success) {
      console.error('[Router] Template setup failed:', setupData);
      // Store error data for error page
      window.App.errorData = setupData;
      window.navigateTo(collection, 'error');
      return;
    }

    // CASE 6: Success but no complete info → let it continue (as requested by user)
    // This handles: /[collection] (without page/code) that returns success but incomplete data
    
    // SUCCESS: Store data and apply theme
    window.App.data = setupData;
    console.log('[Router] Template setup:', setupData);
    
    applyTheme(setupData.theme?.raw || {});
    applyFonts(setupData.fonts || {});
    
    // Update spinner color with highlight
    if (setupData.theme?.raw?.highlight_color) {
      spinnerEl.style.borderTopColor = setupData.theme.raw.highlight_color;
      spinnerEl.classList.add('branded');
    }
    
  } catch (err) {
    // CASE 7: get_template_setup network/timeout error → redirect to collection error
    console.error('[Router] Template setup network error:', err);
    window.App.errorData = { error: 'Network error loading content' };
    window.navigateTo(collection, 'error');
    return;
  }

  // SUCCESS: Render page content
  renderRoute();
  
  // Exit animation after a short delay
  setTimeout(() => {
    exitSplash();
  }, 1000);
}

function exitSplash() {
  const splashEl = document.getElementById('loading-screen');
  if (!splashEl) return;
  splashEl.classList.add('hide');
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  window.App.route = parseRoute();

  // Static config
  const { collection } = window.App.route;
  if (collection && COLLECTION_CONFIG[collection]) {
    window.App.config = COLLECTION_CONFIG[collection];
  }

  // Kick off first load
  const { code } = window.App.route;
  initSplash(collection, code);
});

// Handle browser back/forward
window.addEventListener('popstate', () => {
  window.App.route = parseRoute();
  renderRoute();
});