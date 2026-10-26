
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


(() => {
  'use strict';
  if(location.origin!=='https://www.tradingview.com')return;
  globalThis.__tvChatCloseImage?.();
  let active=null;
  function close(){
    if(!active)return;
    const current=active;active=null;
    window.removeEventListener('keydown',current.keyboard,true);
    window.removeEventListener('pagehide',close);
    current.dialog.close();current.image.removeAttribute('src');current.host.remove();
    if(current.previous?.isConnected)current.previous.focus({preventScroll:true});
  }
  globalThis.__tvChatCloseImage=close;
  globalThis.__tvChatOpenImage=url=>{
    const snap=globalThis.TVChatMedia?.snapshot(url);
    if(!snap)return{ok:false,error:'Only TradingView chart snapshots can be opened.'};
    close();
    const previous=document.activeElement,host=document.createElement('div');host.id='tv-chat-image-viewer';
    const root=host.attachShadow({mode:'open'});
    root.innerHTML=`<style>
      :host{all:initial;color-scheme:dark}*{box-sizing:border-box}
      dialog{position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;height:100vh;max-width:none;max-height:none;background:rgba(0,0,0,.88);color:#b8b8b8;overflow:hidden;font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;outline:none}
      dialog::backdrop{background:transparent}.stage{height:100%;width:100%;display:grid;place-items:center;padding:72px 40px 32px}
      img{display:block;max-width:100%;max-height:calc(100vh - 104px);width:auto;height:auto;object-fit:contain;border-radius:4px;box-shadow:0 10px 60px #0008}
      img[hidden]{display:none}.bar{position:absolute;top:0;left:0;right:0;padding:18px 24px;display:flex;align-items:center;gap:16px;justify-content:space-between;pointer-events:none}
      .bar>*{pointer-events:auto}a{color:#b8b8b8;text-decoration:none;padding:5px 0}a:hover{color:white;text-decoration:underline}button{display:grid;place-items:center;width:34px;height:34px;padding:7px;border:1px solid #444;border-radius:8px;background:#111;color:#bbb;cursor:pointer}button:hover{background:#262626;color:#fff}button:focus-visible,a:focus-visible{outline:2px solid #2962ff;outline-offset:3px}svg{width:18px;height:18px}
      .message{position:absolute;inset:45% 24px auto;text-align:center;pointer-events:none;color:#999}.message[hidden]{display:none}
      @media(max-width:600px){.stage{padding:68px 12px 20px}img{max-height:calc(100vh - 88px)}.bar{padding:14px 16px}}
    </style><dialog aria-label="Chart image viewer"><div class="bar"><a target="_blank" rel="noopener noreferrer">Open on TradingView ↗</a><button type="button" aria-label="Close image" title="Close image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="stage"><img alt="Chart snapshot"></div><div class="message" role="status">Loading image…</div></dialog>`;
    const dialog=root.querySelector('dialog'),image=root.querySelector('img'),message=root.querySelector('.message');
    root.querySelector('a').href=snap.link;
    root.querySelector('button').addEventListener('click',close);
    dialog.addEventListener('click',event=>{if(event.target===dialog || event.target===root.querySelector('.stage'))close();});
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    const keyboard=event=>{if(active?.dialog===dialog && event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}};
    image.addEventListener('load',()=>{message.hidden=true;},{once:true});
    image.addEventListener('error',()=>{image.hidden=true;message.hidden=false;message.textContent='Image unavailable. Use Open on TradingView above to view the snapshot.';},{once:true});
    image.referrerPolicy='no-referrer';image.decoding='async';
    active={host,dialog,image,previous,keyboard};document.documentElement.append(host);
    window.addEventListener('keydown',keyboard,true);window.addEventListener('pagehide',close,{once:true});
    try{dialog.showModal();image.src=snap.image;root.querySelector('button').focus({preventScroll:true});}
    catch{close();return{ok:false,error:'The image viewer could not open. Reload TradingView and try again.'};}
    return{ok:true};
  };
})();


(async () => {
  'use strict';
  if (location.origin !== 'https://www.tradingview.com') return;
  if (document.getElementById('tv-chat-dock')) { globalThis.__tvChatCloseDock?.(); return; }
  const {tabId} = await chrome.runtime.sendMessage({kind:'tv-chat-source'});
  if (!Number.isInteger(tabId)) return;
  const host = document.createElement('div'); host.id = 'tv-chat-dock';
  const oldPadding = document.documentElement.style.getPropertyValue('padding-right');
  const oldPaddingPriority = document.documentElement.style.getPropertyPriority('padding-right');
  const oldSizing = document.documentElement.style.getPropertyValue('box-sizing');
  const oldSizingPriority = document.documentElement.style.getPropertyPriority('box-sizing');
  host.style.cssText = 'all:initial;position:fixed;top:0;bottom:0;right:0;z-index:2147483647;display:block;background:#000000;box-shadow:-8px 0 28px #0005';
  const root = host.attachShadow({mode:'open'});
  const style = document.createElement('style');
  style.textContent = ':host{color-scheme:dark}iframe{display:block;width:100%;height:100%;border:0;background:#000000}button{position:absolute;inset:0 auto 0 -5px;width:9px;border:0;padding:0;background:transparent;cursor:ew-resize;touch-action:none;z-index:2}button:hover,button:focus-visible{background:#55555588;outline:0}.cover{position:absolute;inset:0;cursor:ew-resize;display:none}';
  const frame = document.createElement('iframe'); frame.title = 'TradingView Chat Window';
  frame.src = chrome.runtime.getURL('panel.html') + '?tabId=' + tabId;
  const handle = document.createElement('button'); handle.setAttribute('aria-label','Resize chat panel'); handle.setAttribute('role','separator'); handle.setAttribute('aria-orientation','vertical');
  const extensionUrl=new URL(chrome.runtime.getURL('panel.html'));
  const extensionOrigin=extensionUrl.protocol+'//'+extensionUrl.host;
  function openImage(event){
    if(event.source!==frame.contentWindow || event.origin!==extensionOrigin || event.data?.kind!=='tv-chat-open-image')return;
    const port=event.ports?.[0];if(!port)return;
    let reply;
    try{
      const url=event.data.url;
      if(typeof url!=='string' || url.length>2048 || !globalThis.TVChatMedia?.snapshot(url))reply={ok:false,error:'Only TradingView chart snapshots can be opened.'};
      else reply=globalThis.__tvChatOpenImage?.(url) || {ok:false,error:'Close chat and reopen it using the extension icon to load the image viewer.'};
    }catch{reply={ok:false,error:'The chart image viewer could not open. Close chat and reopen it using the extension icon.'};}
    port.postMessage(reply);port.close();
  }
  window.addEventListener('message',openImage);
  let captureRequest=null;
  function captureReply(result){
    const active=captureRequest;if(!active)return;
    if(result.phase==='started'){active.port.postMessage(result);return;}
    if(result.ok===true && !globalThis.TVChatMedia?.snapshot(result.url))result={ok:false,error:'TradingView returned an invalid chart snapshot.'};
    clearTimeout(active.timer);captureRequest=null;active.port.postMessage(result);active.port.close();
  }
  function prepareCapture(event){
    if(event.source!==frame.contentWindow || event.origin!==extensionOrigin || event.data?.kind!=='tv-chat-prepare-capture')return;
    const port=event.ports?.[0],token=event.data.token;
    if(!port || typeof token!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(token))return;
    if(event.data.photoDataUrl!==undefined){port.postMessage({ok:false,error:'File uploads are not supported. Use the chart snapshot button.'});port.close();return;}
    if(captureRequest){port.postMessage({ok:false,error:'A chart snapshot is still being created. Wait a moment before trying again.'});port.close();return;}
    port.postMessage({phase:'loading'});
    captureRequest={port,token,timer:setTimeout(()=>captureReply({ok:false,error:'TradingView did not finish the snapshot. Your draft is unchanged.'}),35000)};
    chrome.runtime.sendMessage({kind:'tv-chat-capture-start',requestId:token}).catch(()=>captureReply({ok:false,error:'The extension connection was lost. Reload the extension and reopen chat.'}));
  }
  function captureResult(message,sender){
    if(sender.id!==chrome.runtime.id || message?.kind!=='tv-chat-capture-result' || message.requestId!==captureRequest?.token)return false;
    const reply=message.phase==='started'?{phase:'started'}:message.ok===true?{ok:true,url:message.url}:{ok:false,error:typeof message.error==='string'?message.error.slice(0,400):'TradingView could not finish the snapshot.'};
    captureReply(reply);return false;
  }
  window.addEventListener('message',prepareCapture);
  chrome.runtime.onMessage.addListener(captureResult);

  const cover = document.createElement('div'); cover.className = 'cover';
  root.append(style,frame,cover,handle);
  let width = Math.min(460,Math.round(innerWidth * .42));
  let dragging = false;
  function resize(value) {
    width = Math.round(Math.max(Math.min(300,innerWidth * .6),Math.min(value,innerWidth * .6)));
    host.style.width = width + 'px';
    document.documentElement.style.setProperty('box-sizing','border-box','important');
    document.documentElement.style.setProperty('padding-right',width + 'px','important');
    handle.setAttribute('aria-valuenow',String(width));
    window.dispatchEvent(new Event('resize'));
  }
  handle.addEventListener('pointerdown',event => { dragging = true; handle.setPointerCapture(event.pointerId); cover.style.display = 'block'; event.preventDefault(); });
  handle.addEventListener('pointermove',event => { if (dragging) resize(innerWidth - event.clientX); });
  function endDrag() { dragging = false; cover.style.display = 'none'; }
  handle.addEventListener('pointerup',endDrag); handle.addEventListener('pointercancel',endDrag);
  handle.addEventListener('keydown',event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); resize(width + (event.key === 'ArrowLeft' ? 30 : -30)); } });
  let resizeQueued = false;
  function viewportResize() {
    if (!resizeQueued) { resizeQueued = true; requestAnimationFrame(() => { resizeQueued = false; const next=Math.min(width,innerWidth * .6); if (Math.abs(next-width)>1) resize(next); }); }
  }
  globalThis.__tvChatCloseDock = () => {
    globalThis.__tvChatCloseImage?.();
    window.removeEventListener('message',openImage);window.removeEventListener('message',prepareCapture);chrome.runtime.onMessage.removeListener(captureResult);if(captureRequest){clearTimeout(captureRequest.timer);captureRequest.port.close();captureRequest=null;}
    host.remove(); window.removeEventListener('resize',viewportResize);
    if (oldPadding) document.documentElement.style.setProperty('padding-right',oldPadding,oldPaddingPriority); else document.documentElement.style.removeProperty('padding-right');
    if (oldSizing) document.documentElement.style.setProperty('box-sizing',oldSizing,oldSizingPriority); else document.documentElement.style.removeProperty('box-sizing');
    delete globalThis.__tvChatCloseDock; window.dispatchEvent(new Event('resize'));
  };
  document.documentElement.append(host); resize(width); window.addEventListener('resize',viewportResize);
})();

