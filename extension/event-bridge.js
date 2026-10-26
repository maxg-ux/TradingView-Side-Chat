(() => {
  'use strict';
  if (location.origin !== 'https://www.tradingview.com' || globalThis.__tvChatEventsV1) return;
  globalThis.__tvChatEventsV1 = true;
  function control(detail) { window.dispatchEvent(new CustomEvent('tv-chat-push-control',{detail})); }
  window.addEventListener('message',event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'tv-chat-native-push-v1') return;
    const data = event.data;
    let clean;
    if (data.type === 'status') clean = {type:'status',available:data.available === true,connected:data.connected === true,username:/^[\w.-]{1,50}$/.test(data.username || '') ? data.username : '',userId:/^\d{1,20}$/.test(String(data.userId ?? '')) ? String(data.userId) : ''};
    else if (data.type === 'reconnect') clean = {type:'reconnect'};
    else if (data.type === 'change' && /^[\w-]{1,150}$/.test(data.roomId || '') && ['message','message-delete','messages-read','mark-as-unread'].includes(data.action)) clean = {type:'change',roomId:data.roomId,action:data.action,messageId:typeof data.messageId === 'string' ? data.messageId.slice(0,100) : '',membership:data.membership === true};
    if (clean) chrome.runtime.sendMessage({kind:'tv-chat-event',event:clean}).catch(() => {});
  });
  chrome.runtime.onMessage.addListener((message,sender,respond) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message?.kind === 'tv-chat-watch') { control('start'); control('status'); respond({ok:true}); }
    if (message?.kind === 'tv-chat-close') control('stop');
    return false;
  });
  let open = !!document.getElementById('tv-chat-dock');
  new MutationObserver(() => {
    const next = !!document.getElementById('tv-chat-dock');
    if (next !== open) { open = next; control(open ? 'start' : 'stop'); }
  }).observe(document.documentElement,{childList:true});
})();
