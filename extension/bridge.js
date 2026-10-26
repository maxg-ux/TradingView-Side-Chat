(() => {
  'use strict';
  if (location.origin !== 'https://www.tradingview.com' || globalThis.__tvChatBridgeV2) return;
  globalThis.__tvChatBridgeV2 = true;
  document.getElementById('tv-chat-window-local')?.remove();
  chrome.runtime.onMessage.addListener((message,sender,respond) => {
    if (sender.id !== chrome.runtime.id) return false;
    if(message?.kind==='tv-chat-preview'){
      const snapshot=globalThis.TVChatMedia?.snapshot(message.url);
      if(!snapshot){respond({ok:false,error:'Only TradingView chart snapshots can be opened.'});return false;}
      respond(globalThis.__tvChatOpenImage?.(snapshot.link) || {ok:false,error:'Reload TradingView to activate the full-page image viewer.'});return false;
    }
    if (message?.kind === 'tv-chat-page-identity') {
      respond(globalThis.TVChatIdentity?.fromDocument(document) || {}); return false;
    }
    if (message?.kind === 'tv-chat-close') {
      globalThis.__tvChatCloseDock?.(); respond({ok:true}); return false;
    }
    if (message?.kind !== 'tv-chat-request') return false;
    let url, options;
    try {
      url = new URL(message.path,location.origin);
      const method = message.method || 'GET';
      if (url.origin !== location.origin) throw Error('Unsupported request origin.');
      if (method === 'GET' && url.pathname === '/conversation-status/') {
        if (!/^[\w-]{1,150}$/.test(url.searchParams.get('room_id') || '') || !/^\d{1,9}$/.test(url.searchParams.get('offset') || '0')) throw Error('Invalid room request.');
      } else if (method === 'GET' && url.pathname === '/chats/get/') {
        const limit = url.searchParams.get('limit') || '50';
        if (!/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > 500) throw Error('Invalid chat list limit.');
        url.search = '?limit=' + Number(limit);
      } else if (method === 'GET' && url.pathname === '/chats/info/') {
        const roomId=url.searchParams.get('room_id') || '';
        if (!/^[\w-]{1,150}$/.test(roomId)) throw Error('Invalid chat info request.');
        url.search='?room_id='+encodeURIComponent(roomId);
      } else if (method === 'GET' && url.pathname === '/chats/get/members/') {
        const roomId=url.searchParams.get('room_id') || '';
        if(!/^[\w-]{1,150}$/.test(roomId) || url.searchParams.get('page')!=='1' || url.searchParams.get('page_size')!=='4')throw Error('Invalid avatar member request.');
        url.search='?'+new URLSearchParams({room_id:roomId,page:'1',page_size:'4'});
      } else if (method === 'POST' && url.pathname === '/conversation-post/') {
        const form = new URLSearchParams(message.body);
        const text = (form.get('text') || '').trim();
        let meta;
        try { meta = JSON.parse(form.get('meta') || '{}'); } catch { throw Error('Invalid attachment.'); }
        const snapshot = TVChatMedia.fromMeta(meta);
        if (meta?.type && !snapshot) throw Error('Only TradingView snapshot attachments are supported.');
        if (!/^[\w-]{1,150}$/.test(form.get('room_id') || '') || (!text && !snapshot) || text.length > 700) throw Error('Invalid message.');
        if (!['','1'].includes(form.get('is_private') || '')) throw Error('Invalid chat type.');
        options = {body:new URLSearchParams({room_id:form.get('room_id'),text,symbol:'',meta:JSON.stringify(TVChatMedia.toMeta(snapshot)),is_private:form.get('is_private') || ''})};
        if (!form.get('is_private')) options.body.set('interval','D');
        options.body = options.body.toString();
      } else throw Error('Unsupported request.');
      options = {...options,method,credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'XMLHttpRequest','X-Language':'en',...(method === 'POST' ? {'Content-Type':'application/x-www-form-urlencoded'} : {})}};
    } catch(error) {
      respond({transportOk:false,error:error.message,definitive:true}); return false;
    }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),15000);
    fetch(url, {...options,signal:controller.signal}).then(async response => {
      const raw = await response.text();
      if (raw.length > 1000000) throw Error('TradingView response is too large.');
      respond({transportOk:true,ok:response.ok,status:response.status,raw});
    }).catch(error => respond({transportOk:false,error:error.name === 'AbortError' ? 'TradingView request timed out.' : error.message}))
      .finally(() => clearTimeout(timer));
    return true;
  });
})();
