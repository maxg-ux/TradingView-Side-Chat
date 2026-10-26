(() => {
  'use strict';
  if (location.origin !== 'https://www.tradingview.com') return;
  if (globalThis.__tvChatNativePushV1) { globalThis.__tvChatNativePushV1.start(); return; }
  // Reuse the same first-party private-chat event multiplexer as the native client.
  // No new socket, session token, channel subscription, or remote script is created.
  let mux = null, active = false, connected = false, retry = null, attempts = 0;
  function publish(event) { window.postMessage({source:'tv-chat-native-push-v1',...event},location.origin); }
  function status() { publish({type:'status',available:active,connected,username:typeof window.user?.username === 'string' ? window.user.username.slice(0,50) : '',userId:/^\d{1,20}$/.test(String(window.user?.id ?? '')) ? String(window.user.id) : ''}); }
  function onEvent(payload) {
    if (!active || !payload || !['message','message-delete','messages-read','mark-as-unread'].includes(payload.action)) return;
    const id = String(payload.data?.room_id ?? '');
    if (!/^[\w-]{1,150}$/.test(id)) return;
    publish({type:'change',roomId:id,action:payload.action,messageId:payload.action === 'message-delete' ? String(payload.data?.id ?? '').slice(0,100) : '',membership:['join','leave'].includes(payload.data?.type)});
  }
  function onStatus(value) { if (!active) return; connected = value === 2; status(); }
  function onReconnect() { if (active) { connected = true; status(); publish({type:'reconnect'}); } }
  function start() {
    if (active) { status(); return; }
    clearTimeout(retry); attempts++;
    try {
      const chunks = window.webpackChunktradingview;
      if (!Array.isArray(chunks)) throw Error('Native chat runtime unavailable');
      chunks.push([['tv-chat-events-' + Date.now() + '-' + attempts],{},runtime => {
        mux = runtime.c?.[829296]?.exports?.pushStreamMultiplexer;
      }]);
      if (typeof mux?.on !== 'function' || typeof mux?.off !== 'function' || typeof mux?.onPrivateStatus !== 'function') throw Error('Native chat events unavailable');
      active = true;
      mux.on('pm_*',onEvent); mux.onPrivateStatus(onStatus); mux.onReconnect?.(onReconnect,true);
      status();
    } catch {
      active = false; connected = false; status();
      if (attempts < 20) retry = setTimeout(start,1000);
    }
  }
  function stop() {
    clearTimeout(retry); retry = null;
    if (active) { mux.off('pm_*',onEvent); mux.offStatus?.(onStatus); mux.offReconnect?.(onReconnect); }
    active = false; connected = false; attempts = 0;
  }
  window.addEventListener('tv-chat-push-control',event => {
    if (event.detail === 'stop') stop();
    else if (event.detail === 'start') start();
    else if (event.detail === 'status') status();
  });
  window.addEventListener('pagehide',stop,{once:true});
  globalThis.__tvChatNativePushV1 = {start,stop};
  start();
})();
