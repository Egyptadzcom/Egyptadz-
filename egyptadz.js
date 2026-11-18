
/*!
 * EGYPT ADZ — Ad Exchange Slider (v2.0)
 * Blogger + WordPress
 * Current month posts only
 */
(function () {
  'use strict';

  if (window.__eazExchangeLoaded) return;
  window.__eazExchangeLoaded = true;

  /* ===================== CONFIG ===================== */
  var CONFIG = {
    title: 'من متاجر شركائنا',
    joinText: 'انضم لشبكة التبادل',
    joinUrl: 'https://www.egyptadz.com/',
    dir: 'rtl',
    maxItems: 8,
    autoplayMs: 4000,
    cacheMinutes: 30,
    timeoutMs: 8000,
    utmSource: 'egyptadz-exchange',
    utmMedium: 'slider',
    trackUrl: '',
    debug: false,

    members: [
      // BLOGGER - عربي
      {
        name: 'مدونة ايجي سون',
        url: 'https://ranieen.blogspot.com',
        platform: 'blogger'
      },
      {
        name: 'ملتقى الأدباء العرب',
        url: 'https://hadialsadi.blogspot.com',
        platform: 'blogger'
      },

      // BLOGGER - English
      {
        name: 'Forever Overcast',
        url: 'https://foreverovercast.blogspot.com',
        platform: 'blogger'
      },
      {
        name: 'ROSENGLISH',
        url: 'https://rosenglish.blogspot.com',
        platform: 'blogger'
      },

      // WORDPRESS - عربي
      {
        name: 'النخبة العربية',
        url: 'https://arabnokhba.com',
        platform: 'wordpress'
      },
      {
        name: 'مسارات',
        url: 'https://mhralaradi.wordpress.com',
        platform: 'wordpress'
      },

      // WORDPRESS - English
      {
        name: 'WordPress Developer',
        url: 'https://developer.wordpress.org/news',
        platform: 'wordpress'
      }
    ]
  };
  /* ================================================== */

  var PREFIX = 'eaz-';
  var selfHost = cleanHost(location.hostname);
  var CACHE_KEY = 'eaz_exchange_v2_' + selfHost;

  function cleanHost(h) {
    return String(h || '').toLowerCase().replace(/^www\./, '');
  }

  function parseUrl(u) {
    try { return new URL(u); } catch (e) { return null; }
  }

  function isSafeLink(link, memberHost) {
    var u = parseUrl(link);
    return !!u &&
      (u.protocol === 'https:' || u.protocol === 'http:') &&
      cleanHost(u.hostname) === memberHost;
  }

  function isSafeImage(src) {
    var u = parseUrl(src);
    return !!u &&
      (u.protocol === 'https:' || u.protocol === 'http:');
  }

  function decodeText(html) {
    try {
      return (new DOMParser().parseFromString(
        String(html || ''), 'text/html'
      ).documentElement.textContent || '').trim();
    } catch (e) {
      return '';
    }
  }

  function isThisMonth(dateValue) {
    if (!dateValue) return false;

    var d = new Date(dateValue);
    var now = new Date();

    return !isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth();
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () {
        reject(new Error('timeout'));
      }, ms);

      promise.then(
        function (v) {
          clearTimeout(t);
          resolve(v);
        },
        function (e) {
          clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  function addUtm(link) {
    var u = parseUrl(link);
    if (!u) return link;

    u.searchParams.set('utm_source', CONFIG.utmSource);
    u.searchParams.set('utm_medium', CONFIG.utmMedium);
    u.searchParams.set('utm_campaign', selfHost);

    return u.toString();
  }

  function dbg() {
    if (!CONFIG.debug || !window.console) return;

    var a = Array.prototype.slice.call(arguments);
    a.unshift('[EAZ]');
    console.log.apply(console, a);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ---------- Blogger JSONP ---------- */

  function jsonp(url, timeout) {
    return new Promise(function (resolve, reject) {
      var cb = '__eaz_cb_' + Math.random().toString(36).slice(2);
      var s = document.createElement('script');

      var timer = setTimeout(function () {
        cleanup();
        reject(new Error('timeout'));
      }, timeout);

      function cleanup() {
        clearTimeout(timer);

        try {
          delete window[cb];
        } catch (e) {
          window[cb] = undefined;
        }

        if (s.parentNode) {
          s.parentNode.removeChild(s);
        }
      }

      window[cb] = function (data) {
        cleanup();
        resolve(data);
      };

      s.onerror = function () {
        cleanup();
        reject(new Error('script error'));
      };

      s.src = url +
        (url.indexOf('?') > -1 ? '&' : '?') +
        'alt=json-in-script&callback=' + cb;

      document.head.appendChild(s);
    });
  }

  /* ---------- Fetch Blogger ---------- */

  function fromBlogger(member, host) {
    var feed = member.url.replace(/\/+$/, '') +
      '/feeds/posts/default?max-results=30&orderby=published';

    return jsonp(feed, CONFIG.timeoutMs).then(function (data) {
      var entries = (data && data.feed && data.feed.entry) || [];

      var ok = entries.map(function (e) {
        var link = '';

        (e.link || []).forEach(function (l) {
          if (l.rel === 'alternate') link = l.href;
        });

        var img = (e.media$thumbnail && e.media$thumbnail.url) || '';

        if (!img) {
          var html = (e.content && e.content.$t) ||
            (e.summary && e.summary.$t) || '';

          var m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
          if (m) img = m[1];
        }

        img = img.replace(/\/s\d+(-c)?\//, '/s480/');

        return {
          title: decodeText(e.title && e.title.$t),
          link: link,
          image: img,
          published: e.published && e.published.$t
        };

      }).filter(function (x) {
        return x.title &&
          isSafeLink(x.link, host) &&
          isThisMonth(x.published);
      });

      if (!ok.length) throw new Error('no current month entries');

      return pick(ok);
    });
  }

  /* ---------- Fetch WordPress ---------- */

  function fromWordPress(member, host) {
    var api = member.url.replace(/\/+$/, '') +
      '/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc&_embed=1';

    return withTimeout(
      fetch(api, { credentials: 'omit' }),
      CONFIG.timeoutMs
    )
    .then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(function (posts) {

      var ok = (posts || []).map(function (p) {
        var img = '';

        try {
          img = p._embedded['wp:featuredmedia'][0].source_url || '';
        } catch (e) {}

        return {
          title: decodeText(p.title && p.title.rendered),
          link: p.link,
          image: img,
          published: p.date
        };

      }).filter(function (x) {
        return x.title &&
          isSafeLink(x.link, host) &&
          isThisMonth(x.published);
      });

      if (!ok.length) throw new Error('no current month posts');

      return pick(ok);
    });
  }

  /* ---------- Fetch Member ---------- */

  function fetchMember(member) {
    var u = parseUrl(member.url);
    if (!u) return Promise.resolve(null);

    var host = cleanHost(u.hostname);

    if (host === selfHost) return Promise.resolve(null);

    var p = (member.platform || 'auto').toLowerCase();
    var job;

    if (p === 'blogger') {
      job = fromBlogger(member, host);
    } else if (p === 'wordpress') {
      job = fromWordPress(member, host);
    } else {
      job = fromBlogger(member, host).catch(function () {
        return fromWordPress(member, host);
      });
    }

    return job.then(function (item) {
      item.member = member.name || host;
      item.host = host;

      if (item.image && !isSafeImage(item.image)) {
        item.image = '';
      }

      dbg('OK', host, item.title);

      return item;

    }).catch(function (err) {
      dbg('FAIL', host, (err && err.message) || err);
      return null;
    });
  }

  /* ---------- Cache ---------- */

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      var c = JSON.parse(raw);

      if (Date.now() - c.t > CONFIG.cacheMinutes * 60000) {
        return null;
      }

      return c.items;
    } catch (e) {
      return null;
    }
  }

  function writeCache(items) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          t: Date.now(),
          items: items
        })
      );
    } catch (e) {}
  }

  function loadItems() {
    var cached = CONFIG.debug ? null : readCache();

    if (cached && cached.length) {
      return Promise.resolve(cached);
    }

    return Promise.all(CONFIG.members.map(fetchMember))
      .then(function (list) {
        var items = list.filter(Boolean);

        dbg('self host =', selfHost,
          '| loaded', items.length,
          'of', CONFIG.members.length);

        if (items.length) writeCache(items);

        return items;
      });
  }

  /* ---------- Tracking ---------- */

  var seen = {};

  function track(type, item) {
    if (!CONFIG.trackUrl) return;

    try {
      var q = '?e=' + type +
        '&from=' + encodeURIComponent(selfHost) +
        '&to=' + encodeURIComponent(item.host) +
        '&t=' + Date.now();

      new Image().src = CONFIG.trackUrl + q;
    } catch (e) {}
  }

  /* ---------- Styles ---------- */

  function injectStyles() {
    if (document.getElementById(PREFIX + 'style')) return;

    var css = [
      '.eaz-wrap{box-sizing:border-box;margin:24px 0;padding:14px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;font-family:inherit;color:#111827;clear:both}',
      '.eaz-wrap *{box-sizing:border-box}',
      '.eaz-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}',
      '.eaz-title{font-size:16px;font-weight:700;margin:0}',
      '.eaz-nav{display:flex;gap:6px}',
      '.eaz-btn{width:30px;height:30px;border-radius:50%;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:16px;line-height:1;color:#111827}',
      '.eaz-btn:hover{background:#f3f4f6}',
      '.eaz-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;padding-bottom:6px;scrollbar-width:thin}',
      '.eaz-card{flex:0 0 220px;scroll-snap-align:start;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fff;text-decoration:none!important;color:inherit!important;display:flex;flex-direction:column;transition:box-shadow .2s,transform .2s}',
      '.eaz-card:hover{box-shadow:0 6px 18px rgba(0,0,0,.12);transform:translateY(-2px)}',
      '.eaz-img{width:100%;aspect-ratio:4/3;background:#f3f4f6;object-fit:cover;display:block}',
      '.eaz-ph{width:100%;aspect-ratio:4/3;background:linear-gradient(135deg,#e5e7eb,#f9fafb);display:flex;align-items:center;justify-content:center;font-size:28px}',
      '.eaz-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px}',
      '.eaz-badge{align-self:flex-start;font-size:11px;background:#eef2ff;color:#3730a3;padding:2px 8px;border-radius:999px}',
      '.eaz-name{font-size:14px;font-weight:600;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.eaz-foot{margin-top:8px;font-size:12px;text-align:center}',
      '.eaz-foot a{color:#4f46e5;text-decoration:none}',
      '@media (max-width:480px){.eaz-card{flex-basis:70%}}'
    ].join('');

    var st = document.createElement('style');
    st.id = PREFIX + 'style';
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ---------- Elements ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);

    if (cls) n.className = cls;
    if (text != null) n.textContent = text;

    return n;
  }

  /* ---------- Render ---------- */

  function render(container, items) {
    items = shuffle(items.slice()).slice(0, CONFIG.maxItems);

    if (!items.length) return;

    injectStyles();
    container.innerHTML = '';

    var rtl = CONFIG.dir === 'rtl';

    var wrap = el('div', 'eaz-wrap');
    wrap.setAttribute('dir', CONFIG.dir);
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', CONFIG.title);

    var head = el('div', 'eaz-head');
    head.appendChild(el('h3', 'eaz-title', CONFIG.title));

    var nav = el('div', 'eaz-nav');

    var prev = el('button', 'eaz-btn', rtl ? '›' : '‹');
    var next = el('button', 'eaz-btn', rtl ? '‹' : '›');

    prev.type = next.type = 'button';

    prev.setAttribute('aria-label', 'السابق');
    next.setAttribute('aria-label', 'التالي');

    nav.appendChild(prev);
    nav.appendChild(next);

    head.appendChild(nav);
    wrap.appendChild(head);

    var track = el('div', 'eaz-track');

    items.forEach(function (item) {
      var a = el('a', 'eaz-card');

      a.href = addUtm(item.link);
      a.target = '_blank';
      a.rel = 'nofollow sponsored noopener';
      a.setAttribute('data-eaz-host', item.host);

      if (item.image) {
        var img = el('img', 'eaz-img');

        img.loading = 'lazy';
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.src = item.image;

        img.onerror = function () {
          var ph = el('div', 'eaz-ph', '🛍️');

          if (img.parentNode) {
            img.parentNode.replaceChild(ph, img);
          }
        };

        a.appendChild(img);
      } else {
        a.appendChild(el('div', 'eaz-ph', '🛍️'));
      }

      var body = el('div', 'eaz-body');

      body.appendChild(el('span', 'eaz-badge', item.member));
      body.appendChild(el('span', 'eaz-name', item.title));

      a.appendChild(body);

      a.addEventListener('click', function () {
        track('click', item);
      });

      a._eazItem = item;

      track_observe(a);
      track.appendChild(a);
    });

    wrap.appendChild(track);

    var foot = el('div', 'eaz-foot');
    var j = el('a', null, CONFIG.joinText);

    j.href = CONFIG.joinUrl;
    j.target = '_blank';
    j.rel = 'noopener';

    foot.appendChild(j);
    wrap.appendChild(foot);

    container.appendChild(wrap);

    setupControls(track, prev, next, rtl);
  }

  /* ---------- View Tracking ---------- */

  var io = null;

  function track_observe(card) {
    if (!CONFIG.trackUrl ||
        !('IntersectionObserver' in window)) return;

    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var item = en.target._eazItem;

            if (item && !seen[item.host]) {
              seen[item.host] = 1;
              track('view', item);
            }

            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.6 });
    }

    io.observe(card);
  }

  /* ---------- Controls ---------- */

  function setupControls(track, prev, next, rtl) {
    var dir = rtl ? -1 : 1;

    function step() {
      var card = track.querySelector('.eaz-card');

      return card ?
        card.getBoundingClientRect().width + 12 : 220;
    }

    function atEnd() {
      return Math.abs(track.scrollLeft) +
        track.clientWidth >= track.scrollWidth - 4;
    }

    function go(sign) {
      if (sign > 0 && atEnd()) {
        track.scrollTo({ left: 0 });
      } else if (sign < 0 &&
          Math.abs(track.scrollLeft) < 4) {
        track.scrollTo({
          left: dir * track.scrollWidth
        });
      } else {
        track.scrollBy({
          left: dir * sign * step()
        });
      }
    }

    next.addEventListener('click', function () {
      go(1);
    });

    prev.addEventListener('click', function () {
      go(-1);
    });

    var reduce = window.matchMedia &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!CONFIG.autoplayMs || reduce) return;

    var timer = null;

    function start() {
      stop();

      timer = setInterval(function () {
        go(1);
      }, CONFIG.autoplayMs);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    ['mouseenter', 'touchstart', 'focusin'].forEach(function (ev) {
      track.addEventListener(ev, stop, { passive: true });
    });

    ['mouseleave', 'touchend', 'focusout'].forEach(function (ev) {
      track.addEventListener(ev, start, { passive: true });
    });

    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    start();
  }

  /* ---------- Initialization ---------- */

  function getContainer() {
    var c = document.getElementById('eaz-exchange');

    if (c) return c;

    c = document.createElement('div');
    c.id = 'eaz-exchange';

    var s = document.currentScript;

    if (s && s.parentNode) {
      s.parentNode.insertBefore(c, s);
    } else {
      document.body.appendChild(c);
    }

    return c;
  }

  function init() {
    var container = getContainer();
    var started = false;

    function run() {
      if (started) return;

      started = true;

      loadItems().then(function (items) {
        render(container, items);
      });
    }

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) {
          obs.disconnect();
          run();
        }
      }, { rootMargin: '300px' });

      obs.observe(container);
    } else {
      run();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
