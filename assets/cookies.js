/* Aviso de cookies (LGPD) da Marca Direta.
   - Cookies de publicidade e medição (Google Ads) só são carregados depois que a pessoa aceita.
   - A escolha fica salva neste navegador (localStorage) e pode ser alterada a qualquer momento
     pelo link "Preferências de cookies" no rodapé.
   O formulário de contato não depende de cookies e funciona em qualquer escolha. */
(function () {
  'use strict';
  var KEY = 'md_cookie_consent';
  var ADS_ID = 'AW-18394751590';
  var POLICY = '/privacidade/';
  var COUNTER_URL = 'https://xsnubphqakjyhoaeoufc.supabase.co/functions/v1/cookie-consent';

  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v.ads === 'boolean' ? v : null; }
    catch (e) { return null; }
  }
  function save(ads) {
    try { localStorage.setItem(KEY, JSON.stringify({ ads: ads, v: 1, t: new Date().toISOString() })); } catch (e) {}
  }

  // ---- gclid (identificador do clique em anúncio) ----
  // Fica guardado na sessão (sessionStorage) para o formulário conseguir enviá-lo mesmo depois de a pessoa
  // navegar por outras páginas do site. Só passa a ser guardado por 90 dias (localStorage) se ela aceitar
  // os cookies de publicidade e medição.
  var GKEY = 'md_gclid', GDAYS = 90;
  function readJSON(store, key) { try { return JSON.parse(store.getItem(key)); } catch (e) { return null; } }
  function storeLong(g) { try { localStorage.setItem(GKEY, JSON.stringify({ g: g, t: Date.now() })); } catch (e) {} }
  function captureGclid() {
    var g;
    try { g = new URLSearchParams(location.search).get('gclid'); } catch (e) {}
    if (!g) return;
    try { sessionStorage.setItem(GKEY, g); } catch (e) {}
    var c = load();
    if (c && c.ads) storeLong(g);
  }
  // Lido pelo formulário: usa o que está guardado quando o gclid já não está na URL.
  window.mdGetGclid = function () {
    try {
      var s = sessionStorage.getItem(GKEY);
      if (s) return s;
    } catch (e) {}
    var c = load();
    if (c && c.ads) {
      var l = readJSON(localStorage, GKEY);
      if (l && l.g && Date.now() - l.t < GDAYS * 86400000) return l.g;
    }
    return null;
  };
  captureGclid();

  // ---- Google Ads: carrega somente com consentimento ----
  var adsLoaded = false;
  function enableAds() {
    if (adsLoaded) return;
    adsLoaded = true;
    try { var sg = sessionStorage.getItem(GKEY); if (sg) storeLong(sg); } catch (e) {}
    window.mdAdsConsent = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ADS_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag('js', new Date());
    window.gtag('config', ADS_ID);
  }
  function clearAdsCookies() {
    var host = location.hostname, parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-3).join('.'));
    domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^(_ga|_gid|_gcl|_gac|_gat)/.test(name)) {
        domains.forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  // Contador anônimo: envia só a escolha e o caminho da página (sem IP, sem identificador, sem cookie).
  function countChoice(ads, via) {
    try {
      fetch(COUNTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ choice: ads ? 'accepted' : 'necessary', via: via, page: location.pathname }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function apply(ads, hadAds) {
    save(ads);
    if (ads) enableAds();
    else {
      window.mdAdsConsent = false;
      try { localStorage.removeItem(GKEY); } catch (e) {}
      clearAdsCookies();
      // Se já tinha aceitado antes, recarrega para o script do Google sair da página.
      if (hadAds && adsLoaded) location.reload();
    }
  }

  // ---- Estilos ----
  var css = '.mdc-bar{position:fixed;left:0;right:0;bottom:0;z-index:2000;background:#fff;color:var(--ink,#0E2B28);border-top:1px solid var(--line,rgba(14,43,40,.12));box-shadow:0 -6px 24px -14px rgba(14,43,40,.25);padding:10px 44px 10px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;font-family:inherit}.mdc-bar[hidden],.mdc-modal[hidden]{display:none}.mdc-text{flex:1 1 380px;margin:0;font-size:.76rem;line-height:1.5;color:var(--ink-soft,#3E5E5A)}.mdc-text a{color:var(--teal,#1B7A7A);text-decoration:underline;text-underline-offset:2px}.mdc-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.mdc-btn{appearance:none;cursor:pointer;font:inherit;font-weight:600;font-size:.74rem;padding:6px 14px;border-radius:8px;color:var(--teal,#1B7A7A);background:#fff;border:1px solid rgba(27,122,122,.45);white-space:nowrap;transition:background .2s ease}.mdc-btn:hover{background:var(--bg-soft,#EFF6F1)}.mdc-btn[data-mdc=all],.mdc-btn[data-mdc=all]:hover{background:#178A32;color:#fff;border-color:transparent}.mdc-btn[data-mdc=all]:hover{filter:brightness(1.06)}.mdc-link{appearance:none;background:none;border:0;cursor:pointer;font:inherit;font-weight:500;font-size:.74rem;color:var(--ink-soft,#3E5E5A);display:inline-flex;align-items:center;gap:6px;padding:6px 2px}.mdc-link:hover{color:var(--teal,#1B7A7A);text-decoration:underline;text-underline-offset:2px}.mdc-close{position:absolute;top:6px;right:10px;appearance:none;background:none;border:0;cursor:pointer;color:var(--ink-soft,#3E5E5A);font-size:1.25rem;line-height:1;padding:2px 6px}.mdc-btn:focus-visible,.mdc-link:focus-visible,.mdc-close:focus-visible,.mdc-switch input:focus-visible+span{outline:3px solid var(--green,#3ECF4A);outline-offset:2px}.wa-float{transition:transform .25s ease,bottom .25s ease}body.mdc-on .wa-float{bottom:calc(22px + var(--mdc-h,0px)) !important}.mdc-modal{position:fixed;inset:0;z-index:2100;background:rgba(14,43,40,.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit}.mdc-card{background:#fff;color:var(--ink,#0E2B28);border-radius:18px;max-width:480px;width:100%;max-height:90vh;overflow:auto;padding:26px 24px;box-shadow:0 30px 80px -20px rgba(14,43,40,.5)}.mdc-card h2{margin:0 0 8px;font-size:1.15rem;line-height:1.2}.mdc-card p{margin:0;font-size:.86rem;line-height:1.6;color:var(--ink-soft,#3E5E5A)}.mdc-card p a{color:var(--teal,#1B7A7A);text-decoration:underline;text-underline-offset:3px}.mdc-row{display:flex;gap:18px;align-items:flex-start;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line,rgba(14,43,40,.12))}.mdc-row strong{display:block;font-size:.92rem;margin-bottom:4px}.mdc-row p{font-size:.82rem}.mdc-fixed{font-size:.74rem;font-weight:600;color:var(--teal,#1B7A7A);white-space:nowrap;padding-top:2px}.mdc-switch{position:relative;flex:none;width:42px;height:24px}.mdc-switch input{position:absolute;inset:0;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}.mdc-switch span{position:absolute;inset:0;border-radius:999px;background:#c9d4d1;transition:background .2s ease;pointer-events:none}.mdc-switch span::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s ease;box-shadow:0 2px 6px rgba(0,0,0,.25)}.mdc-switch input:checked+span{background:var(--teal,#1B7A7A)}.mdc-switch input:checked+span::after{transform:translateX(18px)}.mdc-foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:20px}.mdc-foot .mdc-btn{padding:9px 18px;font-size:.8rem;background:var(--teal,#1B7A7A);color:#fff;border-color:var(--teal,#1B7A7A)}@media (max-width:640px){.mdc-bar{padding:10px 36px 6px 14px;gap:6px}.mdc-text{font-size:.72rem;line-height:1.45}.mdc-actions{width:100%;gap:6px}.mdc-actions .mdc-btn{flex:1 1 0;padding:7px 4px;font-size:.72rem;text-align:center}.mdc-actions .mdc-link{width:100%;justify-content:center;padding:3px}.mdc-foot .mdc-btn{flex:1 1 100%}}@media (prefers-reduced-motion:reduce){.mdc-btn,.wa-float,.mdc-switch span,.mdc-switch span::after{transition:none}}';

  var ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="7" r="2.2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="17" r="2.2" stroke="currentColor" stroke-width="2"/></svg>';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function init() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var bar = el('<div class="mdc-bar" role="region" aria-label="Aviso de cookies" hidden>' +
      '<p class="mdc-text">Usamos cookies necessários para o site funcionar e, com a sua permissão, cookies de medição para saber se nossos anúncios funcionam. <a href="' + POLICY + '">Saiba mais</a></p>' +
      '<div class="mdc-actions">' +
        '<button type="button" class="mdc-btn" data-mdc="necessary">Somente necessários</button>' +
        '<button type="button" class="mdc-btn" data-mdc="all">Aceitar</button>' +
        '<button type="button" class="mdc-link" data-mdc="prefs">' + ICON + 'Preferências de cookies</button>' +
      '</div>' +
      '<button type="button" class="mdc-close" data-mdc="necessary" aria-label="Fechar e manter somente os cookies necessários">&times;</button>' +
    '</div>');

    var modal = el('<div class="mdc-modal" hidden>' +
      '<div class="mdc-card" role="dialog" aria-modal="true" aria-labelledby="mdc-title">' +
        '<h2 id="mdc-title">Preferências de cookies</h2>' +
        '<p>Escolha quais cookies você permite. Você pode mudar isso quando quiser. Veja os detalhes na <a href="' + POLICY + '">Política de Privacidade</a>.</p>' +
        '<div class="mdc-row"><div><strong>Necessários</strong><p>Fazem o site e a verificação de segurança do formulário funcionarem. Estão sempre ativos.</p></div><span class="mdc-fixed">Sempre ativos</span></div>' +
        '<div class="mdc-row"><div><strong>Publicidade e medição</strong><p>Ajudam a saber se os anúncios do Google trouxeram contatos, para avaliarmos e melhorarmos as campanhas.</p></div>' +
          '<label class="mdc-switch"><input type="checkbox" id="mdc-ads" aria-label="Publicidade e medição"><span></span></label></div>' +
        '<div class="mdc-foot"><button type="button" class="mdc-btn" data-mdc="save">Salvar preferências</button></div>' +
      '</div>' +
    '</div>');

    document.body.appendChild(bar);
    document.body.appendChild(modal);
    function syncBar() {
      var open = !bar.hidden;
      document.body.classList.toggle('mdc-on', open);
      document.documentElement.style.setProperty('--mdc-h', open ? bar.offsetHeight + 'px' : '0px');
    }
    window.addEventListener('resize', syncBar);
    var adsBox = modal.querySelector('#mdc-ads');
    var lastFocus = null;

    function openPrefs() {
      var c = load();
      adsBox.checked = !!(c && c.ads);
      lastFocus = document.activeElement;
      modal.hidden = false;
      modal.querySelector('.mdc-card button, .mdc-card input').focus();
    }
    function closePrefs() { modal.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    function choose(ads, via) {
      var c = load();
      countChoice(ads, via);
      apply(ads, !!(c && c.ads));
      bar.hidden = true;
      modal.hidden = true;
      syncBar();
    }

    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-mdc], [data-cookie-prefs]') : null;
      if (t && t.hasAttribute('data-cookie-prefs')) { e.preventDefault(); openPrefs(); return; }
      if (!t) { if (e.target === modal) closePrefs(); return; }
      var a = t.getAttribute('data-mdc');
      if (a === 'all') choose(true, 'banner');
      else if (a === 'necessary') choose(false, t.classList.contains('mdc-close') ? 'close' : 'banner');
      else if (a === 'prefs') openPrefs();
      else if (a === 'save') choose(adsBox.checked, 'prefs');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closePrefs(); });

    var saved = load();
    if (saved) { if (saved.ads) enableAds(); }
    else setTimeout(function () { if (!load()) { bar.hidden = false; syncBar(); } }, 5000); // aparece 5 s depois de abrir a página
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
