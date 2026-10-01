(function () {
  // Keep local previews out of production recordings.
  const enabled = ['codevanger.su', 'www.codevanger.su', 'codevanger.github.io'].includes(location.hostname);
  if (enabled) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, 'clarity', 'script', 'yqzha72dsi');
  }
  function event(name) {
    if (!enabled) return;
    try { window.clarity('event', name); } catch (_) { /* Analytics must not interrupt the UI. */ }
  }
  function duration(name, milliseconds) {
    const seconds = milliseconds / 1000;
    const bucket = seconds < 1 ? 'under_1s' : seconds < 5 ? '1_5s' : seconds < 15 ? '5_15s' : seconds < 60 ? '15_60s' : 'over_60s';
    event(name + '_' + bucket);
  }
  let active = null, since = null;
  function flush() {
    if (active && since !== null) duration('window_attention_' + active, performance.now() - since);
    since = null;
  }
  function focus(id) {
    if (id === active) return;
    flush(); active = id;
    if (id) { event('window_focus_' + id); if (!document.hidden) since = performance.now(); }
  }
  window.SiteAnalytics = { event, duration, focus };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
    else if (active) since = performance.now();
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('pageshow', () => { if (active && !document.hidden && since === null) since = performance.now(); });
  document.addEventListener('DOMContentLoaded', () => {
    const links = new Map([
      ['https://github.com/Codevanger', 'github_profile'],
      ['https://t.me/codevanger', 'telegram'],
      ['https://www.linkedin.com/in/codevanger/', 'linkedin'],
      ['mailto:me@codevanger.su', 'email'], ['mailto:codevanger@gmail.com', 'gmail'],
      ['https://github.com/Codevanger/TypeMUD-Client', 'typemud_client'],
      ['https://github.com/Codevanger/TypeMUD-Instance', 'typemud_server'],
      ['https://github.com/Codevanger/TypeMUD-WebAPI', 'typemud_api'],
      ['https://store.steampowered.com/app/4620980/Nights_of_the_Sleeping_God/', 'nights_of_the_sleeping_god'],
      ['https://github.com/Codevanger/active-inference', 'active_inference'],
      ['https://github.com/botoxparty/XP.css', 'xp_css']
    ]);
    function linkClick(e) {
      if (e.type === 'auxclick' && e.button !== 1) return;
      const link = e.target.closest?.('a[href]');
      const name = link && links.get(link.getAttribute('href'));
      if (name) event('outbound_' + name);
    }
    document.addEventListener('click', linkClick, true);
    document.addEventListener('auxclick', linkClick, true);
    event('site_visit');
  }, { once: true });
})();
