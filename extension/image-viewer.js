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
