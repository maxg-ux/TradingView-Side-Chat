(() => {
  'use strict';
  function snapshot(value) {
    try {
      const u = new URL(String(value).trim());
      if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
      let id;
      if (u.hostname === 'www.tradingview.com' || u.hostname === 'tradingview.com') {
        id = /^\/x\/([a-zA-Z0-9]{6,16})(?:\/s)?\/?$/.exec(u.pathname)?.[1];
      } else if (u.hostname === 's3.tradingview.com') {
        const m = /^\/snapshots\/([a-zA-Z0-9])\/([a-zA-Z0-9]{6,16})(?:_mid|_thumb)?\.png$/.exec(u.pathname);
        if (m && m[1].toLowerCase() === m[2][0].toLowerCase()) id = m[2];
      }
      if (!id) return null;
      const link=`https://www.tradingview.com/x/${id}/`;
      return {id,link,image:link,preview:link+'s/',fallbackImage:`https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png`};
    } catch { return null; }
  }
  function fromMeta(meta) {
    if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { return null; } }
    const item=meta?.type==='snapshot'?snapshot(meta.url):null;
    if(item && meta.preview_url===item.link)item.displayImage=item.link;
    return item;
  }
  function toMeta(item) {
    const safe = item && snapshot(item.link || item.image);
    return safe ? {type:'snapshot', text:'Chart snapshot', url:safe.link, preview_url:item.displayImage===safe.link?safe.link:safe.preview} : {text:''};
  }
  globalThis.TVChatMedia = Object.freeze({snapshot, fromMeta, toMeta});
})();
