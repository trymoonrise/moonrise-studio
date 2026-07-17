'use strict';

const IFRAME_ATTRS =
  'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"';

const CSS = {
  base: 'font-family:system-ui,-apple-system,sans-serif',
  responsive:
    '.embed{position:relative;width:100%;overflow:hidden;background:#0a0a0c}.embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}',
  ratio169: '.embed--16x9{aspect-ratio:16/9}',
  ratio916: '.embed--9x16{aspect-ratio:9/16}',
  ratio45: '.embed--4x5{aspect-ratio:4/5}',
  mapFill:
    '.map-embed{position:absolute;inset:0;width:100%;height:100%;max-width:none;border:0;display:block}',
  reduced: '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}',
};

const DEMO = {
  youtube: 'aqz-KE-bpKQ',
  youtubeLoop: 'jfKfPfyJRdk',
  vimeo: '76979871',
  maps: '123 Main Street, New York, NY 10001',
  calendar:
    'https://calendar.google.com/calendar/embed?src=en.usa%23holiday%40group.v.calendar.google.com&ctz=America%2FNew_York',
};

function googleMapsEmbed(query, z = 14) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=en&z=${z}&output=embed`;
}

function googleMapsLink(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function youtubeEmbed(id, opts = {}) {
  const {
    autoplay = false,
    mute = true,
    controls = true,
    loop = false,
    start = 0,
  } = opts;
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (autoplay) params.set('autoplay', '1');
  if (mute) params.set('mute', '1');
  if (!controls) params.set('controls', '0');
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', id);
  }
  if (start) params.set('start', String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

function vimeoEmbed(id) {
  return `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`;
}

function spotifyEmbed(type, id) {
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
}

function iframe(src, { className = 'embed__frame', title = 'Embedded content', attrs = IFRAME_ATTRS } = {}) {
  return `<iframe class="${className}" src="${src}" title="${title}" ${attrs}></iframe>`;
}

function mapIframe(query, z, title, className = 'map-embed') {
  return iframe(googleMapsEmbed(query, z), { className, title: title || 'Map' });
}

function youtubeBlock(id, opts = {}, ratio = 'embed--16x9', title = 'Video player') {
  return `<div class="embed ${ratio}">${iframe(youtubeEmbed(id, opts), { className: 'embed__frame', title })}</div>`;
}

const mapHelpers = `function embedUrl(q,z){return 'https://www.google.com/maps?q='+encodeURIComponent(q)+'&hl=en&z='+z+'&output=embed';}function mapsUrl(q){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);}`;

module.exports = {
  CSS,
  DEMO,
  IFRAME_ATTRS,
  googleMapsEmbed,
  googleMapsLink,
  youtubeEmbed,
  vimeoEmbed,
  spotifyEmbed,
  iframe,
  mapIframe,
  youtubeBlock,
  mapHelpers,
};
