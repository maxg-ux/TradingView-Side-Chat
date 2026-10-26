(() => {
  'use strict';
  const targetTabId = Number(new URLSearchParams(location.search).get('tabId'));
  if (!Number.isInteger(targetTabId) || targetTabId <= 0 || !globalThis.chrome?.runtime?.sendMessage) {
    document.body.textContent = 'Open this panel using the Chat Window extension button on your TradingView tab.';
    return;
  }
  const svg = paths => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const icons = {
    camera: svg('<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>'),
    smile: svg('<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 3 4 3 4-3 4-3M8 8h.01M16 8h.01"/>'),
    image: svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m4 16 5-5 4 4 3-3 5 5"/><circle cx="16" cy="8" r="1"/>'),
    send: svg('<path d="M12 20V4m-7 7 7-7 7 7"/>'),
    reply: svg('<path d="m9 5-6 6 6 6M3 11h10a8 8 0 0 1 8 8"/>'),
    down: svg('<path d="m7 10 5 5 5-5"/>'),
    chat: svg('<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>'),
    rooms: svg('<path d="m15 5-7 7 7 7"/>'),
    refresh: svg('<path d="M20 10a8 8 0 1 0-1.7 7M20 4v6h-6"/>'),
    pause: svg('<path d="M8 5v14M16 5v14"/>'),
    play: svg('<path d="m8 5 11 7-11 7Z"/>'),
    close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
    group: svg('<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 4v2"/>'),
  };
  const host = document.createElement('div');
  host.id = 'tv-chat-panel-app';
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:block;color-scheme:dark';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#b8b8b8}
      *{box-sizing:border-box}[hidden]{display:none!important}button,input,textarea{font:inherit}button{cursor:pointer;color:inherit}
      button{background:#1a1a1a;border:1px solid #2b2b2b;border-radius:8px;padding:8px 12px}button:hover{background:#292929}button:disabled{opacity:.4;cursor:default}
      button:focus-visible,a:focus-visible{outline:2px solid #42a5f5;outline-offset:3px}input,textarea{outline:none}a{color:#42a5f5}
      svg{width:18px;height:18px;flex-shrink:0;vertical-align:middle}.shell{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#b8b8b8;height:100%;display:flex;flex-direction:column;background:#000;border:1px solid #252525;overflow:hidden}
      .sub{font-size:11px;color:#858585}.grow{flex:1}#close{width:32px;height:32px;padding:6px;background:transparent;border:0}
      .body{display:flex;min-height:0;flex:1;position:relative}aside{display:none;position:absolute;inset:0 auto 0 0;z-index:4;width:min(270px,85%);background:#080808;padding:18px 12px;border-right:1px solid #292929;overflow:auto;box-shadow:8px 0 20px #0006}
      .room-backdrop{display:none;position:absolute;inset:0;background:#0009;z-index:3}.rooms-open aside,.rooms-open .room-backdrop{display:block}.label{color:#858585;font-size:10px;letter-spacing:1.3px;text-transform:uppercase;margin:0 8px 12px}
      .room{display:block;width:100%;text-align:left;border:1px solid transparent;background:transparent;margin:4px 0;padding:10px 12px;overflow-wrap:anywhere;min-height:40px}.room.active{background:#1a1a1a;border-color:#404040;color:#ddd}.room small{display:block;color:#858585;font-size:11px}.aside-note{margin:18px 8px;font-size:12px;color:#858585}.divider{border-top:1px solid #242424;margin:20px 0}.private-load{width:100%;font-size:12px}.private-list{margin-top:10px}.room-icon{margin-right:8px}
      main{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}.toolbar{padding:14px 12px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #171717}.toolbar h2{font-size:15px;margin:0;overflow-wrap:anywhere}.room-heading{min-width:0;flex:1}.toolbar>.grow{display:none}.tools{display:flex;gap:5px}.tools button{width:30px;height:30px;padding:5px;background:transparent;border-color:transparent}
      #rooms-toggle{display:flex;align-items:center;gap:6px;padding:6px 8px;background:transparent;border-color:#333;font-size:11px}.status{padding:7px 12px;font-size:10px;color:#777;border-bottom:1px solid #151515}.status.error{color:#f7525f;background:#190b0e}
      .feed{overflow:auto;flex:1;padding:6px 12px 14px;scrollbar-color:#292929 #000;scrollbar-width:thin}.history{text-align:center;margin:8px}.history button{font-size:11px;padding:5px 10px;background:transparent;border-color:#252525;color:#888}.empty{padding:45px 10px;color:#858585;text-align:center}
      article{padding:9px 0;display:flex;gap:9px;align-items:flex-end}article.grouped{padding-top:0;margin-top:-4px}.avatar{flex-shrink:0;width:30px;height:30px;border-radius:50%;background:#1d1d1d;color:#b8b8b8;display:grid;place-items:center;font-weight:650;position:relative;overflow:hidden}.avatar img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover}.grouped .avatar{visibility:hidden}
      .message{min-width:0;max-width:calc(100% - 39px);background:#131313;border-radius:10px 10px 10px 0;padding:9px 12px;position:relative}.grouped .message{border-radius:4px 10px 10px 0}.meta{display:flex;align-items:center;gap:8px}.user{font-size:13px;font-weight:650;color:#b8b8b8;text-decoration:none}.grouped .meta{display:none}.text{font-size:15px;white-space:pre-wrap;overflow-wrap:anywhere;margin-top:3px;color:#b8b8b8}.text:empty{display:none}time{display:block;text-align:right;font-size:11px;color:#888;margin-top:3px}.quote{border-left:2px solid #4d4d4d;padding:1px 8px;margin:4px 0;color:#aaa;white-space:pre-wrap}.quote-author{color:#42a5f5}.text a{overflow-wrap:anywhere}.mention{color:#42a5f5}.reply-button{position:absolute;top:3px;right:3px;width:25px;height:25px;padding:4px;border:0;opacity:0;background:#242424}.message:hover .reply-button,.reply-button:focus-visible{opacity:1}.meta{padding-right:17px}.reply-button svg{width:15px;height:15px}
      .emoji{display:inline-block;font-family:Segoe UI Emoji,system-ui;line-height:1.2;vertical-align:-1px}.emoji.inverted{transform:rotate(180deg)}.emoji.coin{font:700 .8em/1.4 system-ui;background:#b88420;color:#000;border-radius:50%;width:1.4em;text-align:center}.emoji.coin[data-emoji-code=":ethereum:"]{background:#8b92ae}
      .snapshot{display:block;border:1px solid #303030;border-radius:8px;overflow:hidden;margin-top:8px;background:#090909;text-decoration:none}.snapshot img{display:block;width:100%;max-width:340px;max-height:220px;object-fit:contain}.snapshot span{display:block;padding:5px 8px;color:#888;font-size:10px}.snapshot.failed img{display:none}
      .composer{position:relative;padding:10px 12px 8px;background:#000}.destination{display:flex;gap:8px;align-items:center;font-size:10px;color:#777;margin:0 2px 7px}.destination strong{font-weight:500}.send-state{display:none}.compose-box{border:1px solid #555;border-radius:17px;padding:10px 11px 9px}.compose-box:focus-within{border-color:#2962ff;box-shadow:0 0 0 1px #2962ff}textarea{display:block;resize:none;height:56px;min-height:56px;max-height:140px;width:100%;border:0;background:transparent;color:#b8b8b8;padding:3px 4px;font-size:14px;line-height:1.5}textarea::placeholder{color:#757575;opacity:1}
      .compose-bottom{display:flex;align-items:center;gap:5px;margin-top:5px}.icon-button{display:grid;place-items:center;width:29px;height:29px;padding:5px;border:0;background:transparent;border-radius:7px;color:#aaa}.icon-button:hover,.icon-button[aria-expanded=true]{background:#242424;color:#ddd}.send{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:9px;background:#2b2b2b;color:#ccc;padding:7px}.send svg{width:20px;height:20px}.send:disabled{opacity:1;color:#555;background:#242424}.send[aria-busy=true]{animation:pulse 1s infinite alternate}@keyframes pulse{to{opacity:.4}}
      .compose-hint{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#666;margin:6px 3px 0}.result{font-size:11px;color:#888;white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 3px 0}.result:empty{display:none}.result.error{color:#f7525f}.result.ok{color:#56c68b}.new{position:absolute;bottom:190px;right:20px;border-radius:20px;display:flex;align-items:center;gap:7px;background:#222;box-shadow:0 4px 20px #0009;font-size:11px;padding:8px 12px;z-index:2}
      .attachment{position:relative;width:126px;margin:2px 3px 9px;border:1px solid #383838;border-radius:9px;overflow:hidden;background:#141414}.attachment img{display:block;width:124px;height:76px;object-fit:cover}.attachment span{display:block;font-size:10px;color:#999;padding:4px 6px}.attachment button{position:absolute;top:4px;right:4px;border:1px solid #444;background:#111d;border-radius:50%;width:24px;height:24px;padding:3px}.attachment button svg{width:16px;height:16px}
      .popover{position:absolute;bottom:calc(100% - 3px);left:12px;right:12px;z-index:5;background:#131313;border:1px solid #383838;border-radius:12px;box-shadow:0 12px 40px #000b;padding:12px;max-height:min(400px,65vh);overflow:auto}.popover-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;font-size:13px;font-weight:650}.popover-head button{width:25px;height:25px;padding:3px;background:transparent;border:0}.popover input{width:100%;border:1px solid #3b3b3b;border-radius:8px;background:#090909;color:#ccc;padding:9px 10px;font-size:12px}.popover input:focus{border-color:#888}.emoji-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:2px;margin-top:10px;max-height:230px;overflow:auto}.emoji-grid button{border:0;background:transparent;padding:5px;font-family:Segoe UI Emoji,system-ui;font-size:23px;line-height:1.2;min-width:0}.emoji-grid button:hover{background:#333}.emoji-empty{grid-column:1/-1;color:#888;font-size:12px;padding:15px 0}.popover p{font-size:11px;color:#888;margin:9px 0}.popover label{display:block;font-size:11px;margin:9px 0 5px;color:#aaa}.image-error{color:#f7525f!important}.image-actions{display:flex;justify-content:flex-end;margin-top:10px}.image-actions button{font-size:12px}.image-candidate{width:100%;max-height:160px;object-fit:contain;border-radius:7px;margin-top:10px;background:#080808}.image-help{border-top:1px solid #303030;padding-top:8px}
      @media(max-width:350px){.sub{font-size:10px}.toolbar{gap:6px;padding:10px}.toolbar h2{font-size:14px}.tools{gap:1px}.tools button{width:27px}.feed{padding-left:9px;padding-right:9px}.composer{padding-left:9px;padding-right:9px}#rooms-toggle span{display:none}.compose-hint{font-size:9px}}

      .toolbar{gap:12px;padding:14px 12px;border-bottom:1px solid #161616}.toolbar h2{font-size:15px;font-weight:650}.toolbar .sub{font-size:12px;margin-top:2px}#rooms-toggle{width:22px;height:32px;padding:0;border:0;justify-content:flex-start}#rooms-toggle svg{width:22px;height:22px}.room-avatar{width:38px;height:38px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#1c1c1c;color:#aaa;flex-shrink:0;font-weight:650}.room-avatar.composite{grid-template-columns:repeat(2,minmax(0,1fr))}.room-avatar-slot{display:grid;place-items:center;position:relative;width:100%;height:100%;min-height:19px;overflow:hidden;background:#242424;font-size:10px}.room-avatar-slot:nth-child(2n){background:#303030}.room-avatar-slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.room-avatar:not(.composite) .room-avatar-slot{font-size:15px}
      .status[hidden]{display:none}.feed{padding:4px 12px 12px}.message-group{display:grid;grid-template-columns:30px minmax(0,1fr);gap:9px;margin:12px 0 26px;align-items:stretch}.avatar-column{display:flex;flex-direction:column;justify-content:flex-end;min-height:30px}.avatar-column .avatar{position:sticky;bottom:0;align-self:flex-start;text-decoration:none;font-size:13px}.message-stack{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}.message-group article{display:block;padding:0;margin:0;width:100%}.message-group .message{width:fit-content;max-width:100%;border-radius:10px 10px 10px 0}.continuation .meta{display:none}.continuation .message{border-radius:4px 10px 10px 0}.message-group.self{grid-template-columns:minmax(0,1fr);padding-left:39px}.message-group.self .avatar-column{display:none}.message-group.self article{display:flex;justify-content:flex-end}.message-group.self .message{background:#1a1a1a;border-radius:10px 10px 0 10px}.message-group.self .meta{display:none}.meta{gap:5px}.mention,.quote-author{color:#42a5f5;text-decoration:none}.mention:hover,.quote-author:hover{text-decoration:underline}.plan-badge{display:inline-flex;align-items:center;position:relative;color:#aaa;cursor:default;line-height:1}.plan-badge svg{width:12px;height:13px}.plan-badge:hover::after,.plan-badge:focus::after{content:attr(data-plan);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);padding:3px 8px;background:#303030;color:#ddd;border-radius:2px;font-size:11px;font-weight:400;white-space:nowrap;z-index:2}.composer{padding-top:8px}
      @media(max-width:350px){.toolbar{gap:8px}.room-avatar{width:34px;height:34px}.toolbar h2{font-size:14px}}

      .new{width:34px;height:34px;right:12px;padding:0;border:1px solid #434343;border-radius:50%;background:#000;color:#b8b8b8;display:grid;place-items:center;box-shadow:none}.new:hover{background:#151515}.new svg{width:16px;height:16px}
      #count{font-size:10px;line-height:1;color:#777;margin:0 8px;font-variant-numeric:tabular-nums;white-space:nowrap}.date-marker{position:absolute;left:50%;transform:translateX(-50%);z-index:2;pointer-events:none;border-radius:16px;padding:3px 10px;background:#000d;color:#b8b8b8;font-size:12px;line-height:18px;white-space:nowrap}

      #conversation{min-height:0}.feed{padding-bottom:calc(var(--composer-height,140px) + 4px);scroll-padding-bottom:calc(var(--composer-height,140px) + 4px)}.composer{position:absolute;left:0;right:0;bottom:0;z-index:3;background:transparent;pointer-events:none;padding:8px 12px 12px}.composer>*{pointer-events:auto}.compose-box{background:#000}.result{margin-top:7px}.directory{display:flex;flex:1;min-width:0;min-height:0;flex-direction:column;background:#000}.directory-header{display:flex;align-items:center;padding:14px 12px 10px;gap:12px}.directory-header h2{font-size:17px;margin:0;flex:1}.directory-header button{border:0;background:transparent;padding:6px;width:32px;height:32px}.chat-tabs{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #252525;padding:0 12px}.chat-tabs button{border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:11px 4px;color:#777;font-size:13px}.chat-tabs button[aria-selected=true]{color:#ccc;border-bottom-color:#ccc}.chat-tabs button:hover{color:#ccc;background:#111}.chat-rows{flex:1;min-height:0;overflow:auto;scrollbar-width:thin;scrollbar-color:#333 #000;padding:0 12px}.chat-row{display:flex;align-items:center;gap:10px;width:100%;min-height:74px;padding:14px 0;border:0;border-bottom:1px solid #202020;border-radius:0;background:#000;text-align:left}.chat-row:hover{background:#101010}.list-avatar{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#242424;color:#ddd;font-size:19px}.list-avatar.composite{grid-template-columns:repeat(2,minmax(0,1fr))}.chat-row-body{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}.chat-row-title{font-size:13px;font-weight:650;color:#b8b8b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chat-row-preview{font-size:13px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chat-row-side{display:flex;align-items:flex-end;align-self:stretch;justify-content:center;flex-direction:column;gap:5px;max-width:110px;flex-shrink:0}.chat-row-time{font-size:10px;color:#777;white-space:nowrap}.unread{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;background:#f23645;color:#fff;border-radius:10px;font-size:11px;line-height:1}.directory-state{padding:10px 14px;font-size:12px;color:#888}.directory-state.error{color:#f7525f}.directory-empty{padding:24px 8px;color:#888;font-size:13px}.more-chats{margin:10px 12px;font-size:12px;background:#101010}
      .initial-avatar{font-family:-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif;font-weight:400}.avatar.initial-avatar{font-size:21px}.room-avatar-slot.initial-avatar,.room-avatar:not(.composite) .room-avatar-slot.initial-avatar{font-size:var(--initial-size,26px)}.list-avatar{--initial-size:28px}.room-avatar.composite,.list-avatar.composite{--initial-size:14px}
      .room-avatar.composite,.list-avatar.composite{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));border:1px solid #242424;box-sizing:border-box}.composite>.room-avatar-slot{min-height:0;min-width:0}.composite>.room-avatar-slot:first-child{grid-area:1/1/3/2}.composite>.room-avatar-slot:nth-child(2):last-child{grid-area:1/2/3/3}.composite>.room-avatar-slot:nth-child(2):not(:last-child){grid-area:1/2/2/3}.composite>.room-avatar-slot:nth-child(3){grid-area:2/2/3/3}
      .avatar,.list-avatar,.room-avatar{outline:1px solid #343434;outline-offset:-1px}
    </style>
    <section class="shell" aria-label="TradingView Chat Window">
      <div class="body">
        <section id="chat-directory" class="directory" aria-label="Chats" hidden><div class="directory-header"><h2>Chats</h2><button id="directory-close" type="button" aria-label="Close chat panel" title="Close chat panel">${icons.close}</button></div><div class="chat-tabs" role="tablist" aria-label="Chat categories"><button type="button" role="tab" data-category="public" aria-selected="true">Public</button><button type="button" role="tab" data-category="private" aria-selected="false" tabindex="-1">Private</button><button type="button" role="tab" data-category="groups" aria-selected="false" tabindex="-1">Groups</button></div><div id="directory-state" class="directory-state" role="status" hidden></div><div id="chat-rows" class="chat-rows"></div><button id="more-chats" class="more-chats" type="button" hidden>Load more chats</button></section>
        <main id="conversation"><div class="toolbar"><button id="rooms-toggle" aria-label="Back to chats" aria-controls="chat-directory" aria-expanded="false">${icons.rooms}</button><div id="room-avatar" class="room-avatar" aria-hidden="true">B</div><div class="room-heading"><h2 id="room-title"># Bitcoin</h2><div class="sub" id="room-detail">Legacy public room · English</div></div><div class="grow"></div><div class="tools"><button id="close" type="button" aria-label="Close chat window" title="Close chat window">${icons.close}</button></div></div>
        <div id="status" class="status" role="status" aria-live="polite" hidden></div>
        <div class="feed" id="feed" role="log" aria-label="Chat messages" aria-live="off"><div class="history"><button id="older" disabled>Load older messages</button></div><div id="messages"><div class="empty">Loading messages…</div></div></div>
        <div id="date-marker" class="date-marker" hidden></div><button id="latest" type="button" class="new" aria-label="Jump to latest messages" title="Jump to latest messages" hidden>${icons.down}</button>
        <form id="compose" class="composer">
          <section class="popover" id="emoji-picker" aria-label="Emoji picker" hidden><div class="popover-head">Emoji<button type="button" id="emoji-close" aria-label="Close emoji picker">${icons.close}</button></div><input id="emoji-search" type="search" placeholder="Search emoji…" aria-label="Search emoji" autocomplete="off"><div id="emoji-grid" class="emoji-grid" aria-label="Emojis"></div></section>
          <div class="compose-box"><div id="attachment" class="attachment" hidden><img id="attachment-image" alt="Attached chart image"><button type="button" id="attachment-remove" aria-label="Remove attached image">${icons.close}</button></div><textarea id="draft" aria-label="Message" placeholder="Type your message here…" maxlength="700"></textarea><div class="compose-bottom"><button type="button" class="icon-button" id="emoji-toggle" aria-label="Choose emoji" aria-expanded="false" title="Emoji">${icons.smile}</button><button type="button" class="icon-button" id="image-toggle" aria-label="Take chart snapshot" aria-expanded="false" aria-busy="false" title="Take chart snapshot">${icons.camera}</button><div class="grow"></div><span id="count">0 / 700</span><button class="send" id="send" type="submit" aria-label="Send message" title="Send message" disabled>${icons.send}</button></div><div id="result" class="result" role="status" aria-live="polite"></div></div>
        </form>
        </main>
      </div>
    </section>`;
  document.documentElement.append(host);
  const $ = (id) => root.getElementById(id);
  const rooms = new Map([
    ['bitcoin', { id: 'bitcoin', title: 'Bitcoin', private: false, category:'public' }],
    ['general', { id: 'general', title: 'General', private: false, category:'public' }],
  ]);
  let room = rooms.get('bitcoin');
  let epoch = 0, timer = null, stopped = false, failures = 0, reading = false, sending = false, capturing = false;
  let messages = new Map(), olderOffset = 0, pending = null, attachment = null, composerObserver = null, followingLatest = true, pushConnected = false, currentUsername = '', currentUserId = '', avatarGeneration=0, refreshQueued = false, pushTimer = null, dateFrame = null;
  let listVisible=false,listCategory='public',listLoading=false,listLoaded=false,listRefreshQueued=false,lastChatCount=0,chatLimit=50,directoryTimer=null,conversationScroll=0;
  let initializing=true,selectionGeneration=0;
  const drafts = new Map();
  let attachmentRevision=0,attachmentReady=false;
  const controllers = new Set();
  const observer = new MutationObserver(() => { if (!host.isConnected) stop(); });
  observer.observe(document.documentElement, { childList: true });
  function stop() {
    stopped = true; clearTimeout(timer); clearTimeout(pushTimer); clearTimeout(directoryTimer); cancelAnimationFrame(dateFrame); chrome.runtime.onMessage.removeListener(onPush); controllers.forEach(c => c.abort());
    observer.disconnect(); composerObserver?.disconnect(); document.removeEventListener('visibilitychange', visibility);
  }
  function status(text, error = false) { $('status').textContent = error ? text : ''; $('status').hidden = !error; $('status').classList.toggle('error', error); }
  function result(text, kind = '') { $('result').textContent = text; $('result').className = 'result ' + kind; }
  function updateComposer() {
    const feed = $('feed'), follow = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 100;
    $('count').textContent = `${$('draft').value.length} / 700`;
    const locked = sending || !!pending || capturing;
    $('send').disabled = locked || !!attachment&&!attachmentReady || (!$('draft').value.trim() && !attachment) || $('draft').value.trim().length > 700;
    $('send').setAttribute('aria-busy', String(sending));
    $('image-toggle').setAttribute('aria-busy',String(capturing));
    $('image-toggle').title = capturing ? 'Taking chart snapshot…' : 'Take chart snapshot';
    $('send').title = sending ? 'Sending…' : pending ? 'Check feed before retrying' : 'Send message';
    for (const id of ['emoji-toggle','image-toggle','attachment-remove']) $(id).disabled = locked;
    $('draft').style.height = '56px'; $('draft').style.height = Math.min(140, Math.max(56, $('draft').scrollHeight)) + 'px';
    if (follow) feed.scrollTop = feed.scrollHeight;
  }
  async function request(path, options = {}) {
    const controller = new AbortController(); controllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const reply = await new Promise((resolve,reject) => {
        controller.signal.addEventListener('abort',() => reject(new DOMException('Request cancelled or timed out.','AbortError')),{once:true});
        chrome.runtime.sendMessage({kind:'tv-chat-request',tabId:targetTabId,path,method:options.method || 'GET',body:options.body}).then(resolve,reject);
      });
      if (!reply?.transportOk) {
        const error = new Error(reply?.error || 'The TradingView connection is unavailable.');
        error.definitive = reply?.definitive === true; throw error;
      }
      const response = {ok:reply.ok,status:reply.status};
      const raw = reply.raw;
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error(`TradingView returned HTTP ${response.status} without JSON. Check your sign-in or reload the page.`); }
      if (data === null || typeof data !== 'object') throw new Error('TradingView returned an unexpected response. Check the feed before retrying.');
      if (!response.ok || data?.error || data?.warning || data?.success === false || data?.ok === false) {
        const value = data?.error || data?.warning || data?.detail || `Request rejected (HTTP ${response.status})`;
        const clean = (typeof value === 'string' ? value : JSON.stringify(value)).replace(/<[^>]*>/g, '');
        const error = new Error(clean || 'TradingView rejected the request.');
        error.status = response.status; error.definitive = true; throw error;
      }
      return data;
    } finally { clearTimeout(timeout); controllers.delete(controller); }
  }
  function messageKey(m) { return String(m.id ?? `${m.username}|${m.time}|${m.text}`); }
  function addText(container, text) {
    text = String(text);
    const pattern = /https?:\/\/[^\s<>"\[\]]+/g;
    let start = 0;
    for (const match of text.matchAll(pattern)) {
      appendPlainText(container, text.slice(start, match.index));
      const a = document.createElement('a'); a.href = match[0]; a.textContent = match[0]; a.target = '_blank'; a.rel = 'noopener noreferrer'; container.append(a);
      start = match.index + match[0].length;
    }
    appendPlainText(container, text.slice(start));
  }
  function renderText(container, text) {
    // Only text and a small BBCode subset. Remote HTML is never inserted into the feed.
    const quote = /\[quote(?:="([^"]*)")?\]([\s\S]*?)\[\/quote\]/gi;
    let start = 0;
    for (const m of String(text).matchAll(quote)) {
      addText(container, String(text).slice(start, m.index));
      const block = document.createElement('div'); block.className = 'quote';
      if (m[1]) { const name = profileLink(m[1]); name.className = 'quote-author mention'; block.append(name,document.createTextNode(' wrote:\n')); }
      addText(block,m[2]); container.append(block);
      start = m.index + m[0].length;
    }
    addText(container, String(text).slice(start));
  }
  function render() {
    const feed = $('feed'), nearEnd = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 100;
    const previousHeight = feed.scrollHeight, previousTop = feed.scrollTop;
    const list = [...messages.values()].sort((a,b) => (Date.parse(a.time) || 0) - (Date.parse(b.time) || 0) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
    const fragment = document.createDocumentFragment();
    let previous = null, group = null, stack = null;
    for (const m of list) {
      const article = document.createElement('article'); article.dataset.messageId = messageKey(m);
      const gap = Date.parse(m.time) - Date.parse(previous?.time);
      const continued = previous?.username === m.username && gap >= 0 && gap < 300000 && localDay(previous.time) === localDay(m.time);
      if (!continued) {
        group = document.createElement('section'); group.className = 'message-group'; group.dataset.author = m.username || '';
        if (isCurrentMember(m)) group.classList.add('self');
        const column = document.createElement('div'); column.className = 'avatar-column'; column.append(avatarFor(m));
        stack = document.createElement('div'); stack.className = 'message-stack'; group.append(column,stack); fragment.append(group);
      } else article.classList.add('continuation');
      previous = m;
      const body = document.createElement('div'); body.className = 'message';
      const meta = document.createElement('div'); meta.className = 'meta';
      const user = document.createElement('a'); user.className = 'user'; user.textContent = m.username || 'TradingView'; user.href = 'https://www.tradingview.com/u/' + encodeURIComponent(m.username || '') + '/'; user.target = '_blank'; user.rel = 'noopener noreferrer';
      const time = document.createElement('time'), date = new Date(m.time); const valid = Number.isFinite(date.getTime());
      if (valid) { time.dateTime = date.toISOString(); article.dataset.messageTime = date.toISOString(); }
      time.textContent = valid ? date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : String(m.time || ''); time.title = valid ? date.toISOString() : '';
      meta.append(user); addPlanBadge(meta,m.badges); const text = document.createElement('div'); text.className = 'text'; renderText(text,m.text || '');
      const reply = document.createElement('button'); reply.type = 'button'; reply.className = 'reply-button'; reply.title = 'Reply to ' + (m.username || 'message'); reply.setAttribute('aria-label',reply.title); reply.innerHTML = icons.reply;
      reply.addEventListener('click', () => {
        if (sending || pending) return;
        const name = String(m.username || 'User').replace(/["\[\]\r\n]/g,'');
        const original = String(m.text || 'Chart snapshot').replace(/\[quote[^\]]*\][\s\S]*?\[\/quote\]/gi,'').trim().slice(0,400);
        insertDraft(`[quote="${name}"]${original}[/quote]\n`);
      });
      body.append(meta,text,reply);
      const picture = TVChatMedia.fromMeta(m.meta);
      const links = picture ? [picture] : Array.from(String(m.text || '').matchAll(/https:\/\/[^\s<>"\[\]]+/g)).map(v => TVChatMedia.snapshot(v[0])).filter(Boolean).slice(0,1);
      for (const snap of links) body.append(snapshotCard(snap));
      body.append(time); article.append(body); stack.append(article);
    }
    if (!list.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'No messages were returned for this room.'; fragment.append(empty); }
    $('messages').replaceChildren(fragment);
    if (nearEnd || previousHeight <= feed.clientHeight) feed.scrollTop = feed.scrollHeight;
    else feed.scrollTop = previousTop;
    updateLatest();
  }
  function schedule(delay) {
    clearTimeout(timer);
    if (!stopped && !listVisible && !document.hidden) timer = setTimeout(() => refresh(), delay ?? Math.min(60000, (room.private && pushConnected ? 60000 : 2500) * 2 ** failures));
  }
  function checkPending(batch) {
    if (!pending || pending.roomId !== room.id) return;
    const echoed = batch.find(m => (m.text || '') === pending.text && (!pending.snapshotId || TVChatMedia.fromMeta(m.meta)?.id === pending.snapshotId) && !pending.before.has(messageKey(m)) && Date.parse(m.time) >= pending.at - 120000);
    if (echoed) {
      result(`Matching text found in the feed as ${echoed.username} · message ${echoed.id}. Confirm this is your username.`, 'ok');
      $('draft').value = ''; $('draft').readOnly = false; drafts.delete(room.id); pending = null; setAttachment(null); updateComposer();
    } else if (Date.now() - pending.at > 45000) {
      result('Delivery is not confirmed. Check the feed or TradingView before sending again. Your draft is preserved. Close and reopen this panel to deliberately retry.', 'error');
    }
  }
  async function refresh({ older = false } = {}) {
    if (stopped || reading || listVisible) return;
    reading = true; clearTimeout(timer);
    const version = epoch, selected = room, offset = older ? olderOffset : 0;
    $('older').disabled = true;
    try {
      const params = new URLSearchParams({ room_id: selected.id, offset: String(offset), stat_interval: 'D', stat_symbol: 'SPX', is_private: selected.private ? '1' : '', _rand: String(Date.now()) });
      const data = await request('/conversation-status/?' + params);
      if (version !== epoch || stopped) return;
      if (!Array.isArray(data?.messages)) throw new Error('TradingView did not return a messages list.');
      const batch = data.messages.filter(m => m && typeof m === 'object');
      const feed = $('feed'), oldHeight = feed.scrollHeight, oldTop = feed.scrollTop;
      let changed = false;
      for (const m of batch) { const key = messageKey(m); if (JSON.stringify(messages.get(key)) !== JSON.stringify(m)) changed = true; messages.set(key,m); }
      if (!older && olderOffset === 0) olderOffset = batch.length;
      if (older) olderOffset += batch.length;
      // A finite in-memory window; no chat history is written to disk or localStorage.
      if (messages.size > 600) {
        const sorted = [...messages.entries()].sort((a,b) => Date.parse(a[1].time) - Date.parse(b[1].time));
        for (const [key] of sorted.slice(0, messages.size - 600)) messages.delete(key);
      }
      if (changed || !messages.size) render(); if (older) feed.scrollTop = oldTop + feed.scrollHeight - oldHeight;
      failures = 0; checkPending(batch);
      status(''); requestDateMarker();
      $('older').dataset.exhausted = String(older ? batch.length === 0 : false);
    } catch (error) {
      if (version !== epoch || stopped) return;
      failures++; status(error.name === 'AbortError' ? 'Request timed out. Reconnecting with a delay.' : error.message, true);
    } finally {
      reading = false;
      if (version === epoch && !stopped) {
        $('older').disabled = $('older').dataset.exhausted === 'true' || !messages.size;
        if (refreshQueued) { refreshQueued = false; queueRefresh(); } else schedule();
      } else if (!stopped) refresh();
    }
  }
  function selectRoom(next) {
    if (sending || pending || next.id === room.id) return;
    selectionGeneration++;
    hideDirectory(false);
    closePickers(); drafts.set(room.id, {text:$('draft').value, attachment}); room = next; epoch++; messages = new Map(); olderOffset = 0; failures = 0;
    const saved = drafts.get(room.id); $('draft').value = saved?.text || ''; setAttachment(saved?.attachment || null); result(''); updateComposer();
    rememberRoom(); renderRoomHeader();
    $('messages').replaceChildren(); $('date-marker').hidden = true; $('date-marker').textContent = ''; status('Loading ' + room.title + '…'); refresh();
    if(room.private)updateRoomMetadata();
  }
  $('draft').addEventListener('input', () => { if (!pending && !sending) result(''); updateComposer(); });
  $('draft').addEventListener('paste', e => {
    const snap = TVChatMedia.snapshot(e.clipboardData?.getData('text/plain'));
    if (capturing && (snap || e.clipboardData?.files.length)) { e.preventDefault(); result('Wait for the chart snapshot before changing the image.'); return; }
    if (snap && !sending && !pending) { e.preventDefault(); setAttachment(snap); result('Chart image attached. Click Send when ready.'); }
    else if(e.clipboardData?.files.length){e.preventDefault();if(!sending&&!pending)result('Use the chart snapshot button to attach an image.','error');}
  });
  $('draft').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); $('compose').requestSubmit(); } });
  $('compose').addEventListener('submit', async e => {
    e.preventDefault(); const text = $('draft').value.trim();
    if (sending || pending || capturing || attachment&&!attachmentReady || (!text && !attachment) || text.length > 700) return;
    closePickers();
    const selected = room; sending = true;
    pending = { roomId: room.id, text, snapshotId: attachment?.id || null, at: Date.now(), before: new Set(messages.keys()) };
    updateComposer(); $('draft').readOnly = true; result('Sending…');
    try {
      const body = new URLSearchParams({ room_id: selected.id, text, symbol: '', meta: JSON.stringify(TVChatMedia.toMeta(attachment)), is_private: selected.private ? '1' : '' });
      if (!selected.private) body.set('interval', 'D');
      await request('/conversation-post/', { method:'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'}, body:body.toString() });
      if (stopped) return;
      if (pending) {
        result('TradingView accepted the request. Waiting for the message to appear in the feed…', 'ok');
      }
    } catch (error) {
      if (stopped) return;
      if (error.definitive) { pending = null; result('Not sent: ' + error.message, 'error'); }
      else result('Delivery is unknown. ' + (error.name === 'AbortError' ? 'The request timed out.' : error.message) + ' Check the feed before retrying; the panel will not resend automatically.', 'error');
    } finally {
      sending = false; if (!stopped) { $('draft').readOnly = !!pending; updateComposer(); refresh(); }
    }
  });
  const emojiList = [
    ['😀','grinning happy smile','grinning'],['😃','smiley happy','smiley'],['😄','smile happy','smile'],['😁','grin teeth','grin'],['😂','joy laugh tears','joy'],['🤣','rolling laughing','rofl'],['😊','blush happy','blush'],['🙂','slight smile','slightly_smiling_face'],['😉','wink','wink'],['😍','heart eyes love','heart_eyes'],['🥰','love hearts','smiling_face_with_three_hearts'],['😘','kiss love','kissing_heart'],['😎','sunglasses cool','sunglasses'],['🤔','thinking face','thinking_face'],['🧐','monocle curious','face_with_monocle'],['🤨','raised eyebrow','face_with_raised_eyebrow'],['😏','smirk','smirk'],['🙃','upside down','upside_down_face'],['😐','neutral face','neutral_face'],['😅','sweat smile relief','sweat_smile'],['😬','grimacing nervous','grimacing'],['😮','open mouth surprised','open_mouth'],['😱','scream shocked','scream'],['🤯','mind blown exploding head','exploding_head'],['😴','sleeping tired','sleeping'],['😭','sob cry','sob'],['😢','cry sad','cry'],['😤','triumph frustrated','triumph'],['😡','rage angry','rage'],['🤬','cursing angry','face_with_symbols_on_mouth'],['🤡','clown','clown_face'],['💀','skull dead','skull'],['👀','eyes watching','eyes'],['🤫','shush quiet','shushing_face'],['🫡','salute respect','saluting_face'],
    ['👍','thumbs up yes good','+1'],['👎','thumbs down no','-1'],['👏','clap applause','clap'],['🙌','raised hands celebration','raised_hands'],['🙏','pray thanks please','pray'],['🤝','handshake agree','handshake'],['💪','muscle strong','muscle'],['✌️','victory peace','v'],['🤞','crossed fingers luck','crossed_fingers'],['👌','ok hand','ok_hand'],['👋','wave hello goodbye','wave'],['🫶','heart hands love','heart_hands'],['❤️','heart love red','heart'],['💚','green heart','green_heart'],['💙','blue heart','blue_heart'],['💔','broken heart','broken_heart'],['💯','hundred perfect','100'],['🔥','fire hot','fire'],['✨','sparkles','sparkles'],['🎉','party celebration','tada'],['🏆','trophy winner','trophy'],['🥇','gold medal first','first_place_medal'],
    ['📈','chart up bullish stocks','chart_with_upwards_trend'],['📉','chart down bearish stocks','chart_with_downwards_trend'],['🚀','rocket moon bullish','rocket'],['🌕','full moon','full_moon'],['🐂','bull bullish','ox'],['🐻','bear bearish','bear'],['🐳','whale','whale'],['💎','gem diamond hands','gem'],['💰','money bag profit','moneybag'],['💸','money wings loss','money_with_wings'],['💵','dollar cash','dollar'],['🤑','money face rich','money_mouth_face'],['🎯','dart target','dart'],['⚠️','warning risk','warning'],['🛑','stop risk','octagonal_sign'],['✅','check yes','white_check_mark'],['❌','cross no','x'],['❓','question','question'],['⏳','hourglass waiting','hourglass_flowing_sand'],['⏰','alarm clock time','alarm_clock'],['🧠','brain think','brain'],['👑','crown king','crown'],['🐐','goat greatest','goat'],['🍿','popcorn watching','popcorn'],['☕','coffee morning','coffee'],['🍺','beer cheers','beer'],['🍻','beers cheers','beers'],['🍕','pizza','pizza'],['🍀','four leaf clover luck','four_leaf_clover'],['🌙','crescent moon night','crescent_moon'],['☀️','sun morning','sunny'],['🌧️','rain weather','cloud_rain'],['⚡','zap lightning','zap'],['🐱','cat','cat'],['🐶','dog','dog'],['🤖','robot bot ai','robot_face'],['👻','ghost','ghost'],['🎲','dice risk','game_die'],['🧊','ice cold','ice_cube'],['🧘','meditation calm','person_in_lotus_position'],['🛌','bed sleep','sleeping_accommodation']
  ];
  const shortcode = new Map([...emojiList.map(([emoji,,code]) => [':' + code + ':',emoji]), ...TVChatEmoji.entries.map(e=>[e.code,e.emoji]), [':&#039;(', '😢']]);
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namedCodes = [...shortcode.keys()].filter(code=>code.startsWith(':') && code.endsWith(':'));
  const shortcuts = [...shortcode.keys()].filter(code=>!namedCodes.includes(code));
  const emojiPattern = new RegExp(namedCodes.sort((a,b)=>b.length-a.length).map(escapeRegex).join('|') + '|(?<![\\w:])(?:' + shortcuts.sort((a,b)=>b.length-a.length).map(escapeRegex).join('|') + ')(?![\\w:])','g');
  const pickerChoices = emojiList.map(([emoji,words,code])=>({emoji,words,code:TVChatEmoji.codeFor(emoji) || ':'+code+':',insert:TVChatEmoji.codeFor(emoji) || emoji}));
  const listedCodes = new Set(pickerChoices.map(e=>e.code));
  for (const e of TVChatEmoji.entries) if (!listedCodes.has(e.code)) pickerChoices.push({emoji:e.emoji,words:e.label.toLowerCase(),code:e.code,insert:e.code});
  function appendPlainText(container, text) {
    let start = 0;
    for (const match of String(text).matchAll(emojiPattern)) {
      appendMentions(container,text.slice(start,match.index));
      const code = match[0], span = document.createElement('span'), native = TVChatEmoji.get(code);
      span.className = 'emoji' + (code === ':inverted_rocket:' ? ' inverted' : '') + (code === ':bitcoin:' || code === ':ethereum:' ? ' coin' : '');
      span.textContent = shortcode.get(code); span.title = code; span.dataset.emojiCode = code;
      span.setAttribute('role','img'); span.setAttribute('aria-label',native?.label || code);
      container.append(span); start = match.index + code.length;
    }
    appendMentions(container,text.slice(start));
  }
  function insertDraft(text) {
    if (sending || pending) return;
    const input = $('draft'), start = input.selectionStart, end = input.selectionEnd;
    if (input.value.length - (end-start) + text.length > 700) { result('Message would exceed 700 characters.', 'error'); input.focus(); return; }
    input.setRangeText(text,start,end,'end'); input.focus(); result(''); updateComposer();
  }
  function closePickers() {
    for (const name of ['emoji']) { $(name + '-picker').hidden = true; $(name + '-toggle').setAttribute('aria-expanded','false'); }
  }
  function openPicker(name) {
    if (sending || pending) return;
    const wasOpen = !$(name + '-picker').hidden; closePickers();
    if (wasOpen) { $('draft').focus(); return; }
    $(name + '-picker').hidden = false; $(name + '-toggle').setAttribute('aria-expanded','true');
    if (name === 'emoji') { $('emoji-search').value = ''; renderEmoji(); $('emoji-search').focus(); }
  }
  function renderEmoji() {
    const term = $('emoji-search').value.trim().toLowerCase(), fragment = document.createDocumentFragment();
    for (const {emoji,words,code,insert} of pickerChoices) {
      if (term && !(`${emoji} ${words} ${code}`).includes(term)) continue;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = emoji;
      button.title = code; button.setAttribute('aria-label',words + ' ' + code);
      button.addEventListener('click',() => { insertDraft(insert); closePickers(); }); fragment.append(button);
    }
    if (!fragment.childNodes.length) { const empty = document.createElement('div'); empty.className = 'emoji-empty'; empty.textContent = 'No emoji found. Try “smile”, “bull” or “heart”.'; fragment.append(empty); }
    $('emoji-grid').replaceChildren(fragment);
  }
  async function snapshotPreview(value){
    for(const url of [...new Set([value.displayImage,value.preview,value.image,value.fallbackImage].filter(Boolean))]){
      const image=new Image();image.referrerPolicy='no-referrer';image.decoding='async';image.src=url;
      let timer;
      try{await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Image not ready')),5000);})]);return url;}
      catch{image.removeAttribute('src');}finally{clearTimeout(timer);}
    }
    throw Error('The chart image has not loaded. Try taking the snapshot again; your text is unchanged.');
  }
  function setAttachment(value) {
    const feed = $('feed'), follow = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 100;
    const version=++attachmentRevision;
    attachment = value;attachmentReady=false; $('attachment').hidden = !value;
    const image=$('attachment-image');image.hidden=true;image.removeAttribute('src');
    if(value){
      snapshotPreview(value).then(url=>{
        if(stopped || version!==attachmentRevision)return;
        value.displayImage=url;image.src=url;image.referrerPolicy='no-referrer';image.hidden=false;attachmentReady=true;updateComposer();
      }).catch(error=>{if(!stopped && version===attachmentRevision){result(error.message,'error');updateComposer();}});
    }
    updateComposer();
    if (follow) feed.scrollTop = feed.scrollHeight;
  }
  function requestChartSnapshot(){
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();let timer;const token=crypto.randomUUID();
      const finish=(error,value)=>{clearTimeout(timer);channel.port1.close();if(error)reject(error);else resolve(value);};
      timer=setTimeout(()=>finish(Error('Close chat and reopen it using the extension icon to activate chart snapshots.')),3000);
      channel.port1.onmessage=event=>{
        if(event.data?.phase==='loading'){clearTimeout(timer);timer=setTimeout(()=>finish(Error('TradingView did not start the snapshot. Your draft is unchanged.')),35000);return;}
        if(event.data?.phase==='started'){
          clearTimeout(timer);timer=setTimeout(()=>finish(Error('Chart snapshot timed out. Your draft is unchanged.')),35000);return;
        }
        finish(null,event.data);
      };
      try{parent.postMessage({kind:'tv-chat-prepare-capture',token},'https://www.tradingview.com',[channel.port2]);}
      catch{finish(Error('The chart window could not start the snapshot. Your draft is unchanged.'));}
    });
  }
  async function captureChart() {
    if (sending || pending || capturing || stopped) return;
    closePickers(); capturing = true; updateComposer(); result('Taking chart snapshot…');
    const selectedId=room.id;
    try {
      const response=await requestChartSnapshot();
      if (stopped || selectedId!==room.id) return;
      if (!response?.ok) throw Error(response?.error || 'TradingView could not create the chart snapshot.');
      const snap=TVChatMedia.snapshot(response.url);
      if (!snap) throw Error('TradingView returned an invalid chart snapshot link.');
      snap.displayImage=await snapshotPreview(snap);
      if(stopped || selectedId!==room.id)return;
      setAttachment(snap); result('Chart image attached. Click Send when ready.');
      if (!listVisible) $('draft').focus({preventScroll:true});
    } catch (error) {
      if (!stopped && selectedId===room.id) result(error.message || 'The chart snapshot failed. Your draft is unchanged.','error');
    } finally { capturing=false; if (!stopped) updateComposer(); }
  }
  function expandImage(url){
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      const finish=(error)=>{clearTimeout(timer);channel.port1.close();if(error)reject(error);else resolve();};
      const timer=setTimeout(()=>finish(Error('Close chat and reopen it using the extension icon to load the image viewer.')),5000);
      channel.port1.onmessage=event=>finish(event.data?.ok===true?null:Error(event.data?.error || 'The chart image viewer could not open.'));
      try{parent.postMessage({kind:'tv-chat-open-image',url},'https://www.tradingview.com',[channel.port2]);}
      catch{finish(Error('The chart window could not open this image. Reopen chat using the extension icon.'));}
    });
  }
  function snapshotCard(snap) {
    const a = document.createElement('a'); a.className = 'snapshot'; a.href = snap.link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('aria-label','Open chart image');
    const img = document.createElement('img'); img.src = snap.image; img.alt = 'Chart snapshot'; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    img.addEventListener('error',() => { a.classList.add('failed'); const fallback=document.createElement('span'); fallback.textContent='Image unavailable · Open on TradingView ↗'; a.append(fallback); });
    a.append(img);
    a.addEventListener('click',async e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || a.classList.contains('failed')) return;
      e.preventDefault();
      try{
        await expandImage(snap.link);
      }catch(error){if(!stopped)result(error.message,'error');}
    });
    return a;
  }
  function localDay(value) {
    const d = new Date(value); if (!Number.isFinite(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function requestDateMarker() {
    if (dateFrame !== null || stopped) return;
    dateFrame = requestAnimationFrame(() => { dateFrame = null; updateDateMarker(); });
  }
  function updateDateMarker() {
    const marker = $('date-marker'); if (listVisible) { marker.hidden=true; return; } const feed = $('feed'), bounds = feed.getBoundingClientRect();
    marker.style.top = (feed.offsetTop + 8) + 'px';
    let visible = null;
    for (const article of $('messages').querySelectorAll('article[data-message-time]')) {
      const box = article.getBoundingClientRect();
      if (box.bottom > bounds.top + 1 && box.top < bounds.bottom) { visible = article.dataset.messageTime; break; }
    }
    const date = new Date(visible || NaN), now = new Date();
    if (!Number.isFinite(date.getTime()) || localDay(date) === localDay(now)) {
      marker.hidden = true; marker.textContent = ''; return;
    }
    marker.textContent = date.toLocaleDateString([], {month:'long',day:'numeric',...(date.getFullYear() !== now.getFullYear() ? {year:'numeric'} : {})});
    marker.hidden = false;
  }
  function updateLatest() { if (listVisible) { $('latest').hidden=true; $('date-marker').hidden=true; return; } const f = $('feed'); followingLatest = f.scrollHeight - f.scrollTop - f.clientHeight < 100; $('latest').hidden = followingLatest; requestDateMarker(); }
  composerObserver = new ResizeObserver(() => { if (listVisible) return; const height=$('compose').offsetHeight; root.querySelector('main').style.setProperty('--composer-height',height+'px'); $('latest').style.bottom=height+'px'; if (followingLatest) $('feed').scrollTop=$('feed').scrollHeight; updateLatest(); });
  composerObserver.observe($('compose')); composerObserver.observe($('feed'));
  $('feed').addEventListener('scroll',updateLatest,{passive:true});
  $('latest').addEventListener('click',() => { $('feed').scrollTo({top:$('feed').scrollHeight,behavior:'instant'}); $('draft').focus({preventScroll:true}); });
  $('emoji-toggle').addEventListener('click',() => openPicker('emoji'));
  $('image-toggle').addEventListener('click',captureChart);
  for (const name of ['emoji']) $(name + '-close').addEventListener('click',() => { closePickers(); $('draft').focus(); });
  $('emoji-search').addEventListener('input',renderEmoji);
  $('emoji-search').addEventListener('keydown',e => { if (e.key === 'Enter') e.preventDefault(); });
  $('attachment-remove').addEventListener('click',() => { if (!sending && !pending) { setAttachment(null); result(''); $('draft').focus(); } });
  root.addEventListener('click',e => { if (!e.composedPath().includes($('compose'))) closePickers(); });

  function profileLink(username, text = '@' + username) {
    const a = document.createElement('a'); a.className = 'mention'; a.textContent = text;
    a.href = 'https://www.tradingview.com/u/' + encodeURIComponent(username) + '/'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    return a;
  }
  function appendMentions(container,text) {
    const pattern = /(^|[^\w@./-])@([A-Za-z0-9_][A-Za-z0-9_.-]{0,49})/g;
    let start = 0;
    for (const m of text.matchAll(pattern)) {
      const username = m[2].replace(/\.+$/,'');
      if (!username) continue;
      const at = m.index + m[1].length;
      container.append(document.createTextNode(text.slice(start,at)),profileLink(username));
      start = at + username.length + 1;
    }
    container.append(document.createTextNode(text.slice(start)));
  }
  function pictureUrl(value) {
    try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 's3.tradingview.com' && !u.username && !u.password && !u.port && u.pathname.startsWith('/userpics/') ? u.href : null; } catch { return null; }
  }
  function nativeInitialAvatar(value) {
    if (typeof value!=='string' || !value.startsWith('data:image/svg+xml,') || value.length>12000) return null;
    try {
      const source=decodeURIComponent(value.slice('data:image/svg+xml,'.length));
      if (/<!DOCTYPE|<!ENTITY/i.test(source)) return null;
      const doc=new DOMParser().parseFromString(source,'image/svg+xml'),root=doc.documentElement;
      if (root.localName!=='svg' || root.namespaceURI!=='http://www.w3.org/2000/svg' || doc.querySelector('parsererror')) return null;
      const children=[...root.children];
      if(children.length!==2 || children[0].localName!=='rect' || children[1].localName!=='text' || children.some(e=>e.children.length))return null;
      const color=children[0].getAttribute('fill') || '',letter=children[1].textContent || '';
      const hsl=/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/.exec(color);
      if(!hsl || Number(hsl[1])>360 || Number(hsl[2])>100 || Number(hsl[3])>100 || !/^[\p{L}\p{N}_]$/u.test(letter))return null;
      return {color:`hsl(${Number(hsl[1])},${Number(hsl[2])}%,${Number(hsl[3])}%)`,letter};
    } catch { return null; }
  }
  function initialAvatar(username) {
    const name=String(username || '?'),letter=[...name][0].toUpperCase();let hash=0;
    for(const char of name.toLowerCase())hash=(Math.imul(hash,31)+char.codePointAt(0))>>>0;
    return {color:`hsl(${hash%360},25%,50%)`,letter};
  }
  function picture(parent,value,alt,username='') {
    const native=nativeInitialAvatar(value),fallback=native || initialAvatar(username);
    parent.style.backgroundColor=fallback.color;parent.style.color='#fff';parent.textContent=fallback.letter;
    parent.classList.add('initial-avatar');
    if(native)return;
    const url = pictureUrl(value); if (!url) return;
    const img = document.createElement('img'); img.src = url; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    img.addEventListener('load',()=>{
      parent.classList.remove('initial-avatar');parent.style.backgroundColor='transparent';
      for(const node of [...parent.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
    },{once:true});
    img.addEventListener('error',()=>{parent.classList.add('initial-avatar');parent.style.backgroundColor=fallback.color;parent.replaceChildren(document.createTextNode(fallback.letter));},{once:true}); parent.append(img);
  }
  function avatarFor(m) {
    const a = profileLink(m.username || ''); a.className = 'avatar'; a.setAttribute('aria-label',(m.username || 'User') + ' profile');
    picture(a,m.user_pic,(m.username || 'User') + ' profile picture',m.username); return a;
  }
  function addPlanBadge(meta,badges) {
    if (!Array.isArray(badges)) return;
    const plan = badges.find(b=>b && typeof b.name === 'string' && /^(?:pro|prof):/.test(b.name) && typeof b.verbose_name === 'string' && b.verbose_name.trim());
    if (!plan) return;
    const badge = document.createElement('span'); badge.className = 'plan-badge'; badge.tabIndex = 0;
    badge.dataset.plan = plan.verbose_name.slice(0,80); badge.setAttribute('role','img'); badge.setAttribute('aria-label',badge.dataset.plan + ' plan');
    const doubleBar = plan.name.startsWith('prof:') || plan.name.includes('premium_expert');
    badge.innerHTML = svg(doubleBar ? '<path fill="currentColor" stroke="none" d="M5 4h4L4 20H0ZM15 4h4l-5 16h-4Z"/>' : '<path fill="currentColor" stroke="none" d="M9 4h6l-5 16H4Z"/>');
    meta.append(badge);
  }
  function renderRoomHeader() {
    $('room-title').textContent = (room.private ? '' : '# ') + room.title;
    const count = Number(room.membersCount);
    $('room-detail').textContent = room.category !== 'private' && Number.isInteger(count) && count > 0 ? count.toLocaleString() + (count === 1 ? ' member' : ' members') : '';
    $('room-detail').hidden = !$('room-detail').textContent;
    const avatar = $('room-avatar'); avatar.replaceChildren();
    const members = avatarMembers(room);
    if (!members.length) { avatar.textContent = room.title.slice(0,1).toUpperCase(); avatar.classList.remove('composite'); return; }
    avatar.classList.toggle('composite',members.length > 1);
    for (const member of members) {
      const slot = document.createElement('span'); slot.className = 'room-avatar-slot'; picture(slot,member.user_pic,member.username || 'Group member',member.username); avatar.append(slot);
    }
  }
  function queueRefresh() {
    if (stopped || initializing || listVisible || document.hidden) return;
    if (reading) { refreshQueued = true; return; }
    if (pushTimer !== null) return;
    pushTimer = setTimeout(()=>{ pushTimer = null; refresh(); },100);
  }
  function onPush(message,sender) {
    if (sender.id !== chrome.runtime.id || message?.kind !== 'tv-chat-event' || message.tabId !== targetTabId || stopped) return;
    const event = message.event;
    if (listVisible && (event?.type === 'change' || event?.type === 'reconnect')) { queueDirectoryRefresh(); return; }
    if (event?.type === 'status') {
      const changed = pushConnected !== (event.available && event.connected);
      pushConnected = event.available === true && event.connected === true;
      applyIdentity(event);
      if (changed) { schedule(); queueRefresh(); }
    } else if (event?.type === 'reconnect') queueRefresh();
    else if (event?.type === 'change' && event.roomId === room.id) {
      if (event.action === 'message-delete' && event.messageId && messages.delete(String(event.messageId))) render();
      if (event.membership) updateRoomMetadata();
      queueRefresh();
    }
  }
  async function updateRoomMetadata() {
    if (!room.private || stopped) return;
    const selected = room, version=epoch;
    try {
      const data = await request('/chats/info/?room_id='+encodeURIComponent(selected.id));
      if (stopped || room.id !== selected.id || version!==epoch) return;
      const chat=data?.room;
      if (chat && String(chat.room_id)===selected.id) { upsertChat(chat); renderRoomHeader(); await refreshChatAvatars([selected]); if(!stopped && version===epoch)renderRoomHeader(); }
    } catch { /* Message errors remain in the feed connection indicator. */ }
  }
  chrome.runtime.onMessage.addListener(onPush);
  chrome.runtime.sendMessage({kind:'tv-chat-watch',tabId:targetTabId}).catch(()=>{});
  const identityReady = chrome.runtime.sendMessage({kind:'tv-chat-identity',tabId:targetTabId}).then(applyIdentity).catch(()=>{});

  $('older').addEventListener('click', () => refresh({ older:true }));
  function chatTime(value) {
    if (typeof value === 'number' || typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)) {
      const n = Number(value); return new Date(n < 1e12 ? n*1000 : n);
    }
    return new Date(value || NaN);
  }
  function listTime(value) {
    const date = chatTime(value); if (!Number.isFinite(date.getTime())) return '';
    const seconds = (Date.now()-date.getTime())/1000, minutes = Math.floor(Math.abs(seconds)/60);
    if (Math.abs(seconds) < 60) return 'Just now';
    if (Math.abs(seconds) < 3600) return seconds < 0 ? `in ${minutes} min` : `${minutes} min ago`;
    if (localDay(date) === localDay(new Date())) return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    return date.toLocaleDateString([], {month:'short',day:'numeric',...(date.getFullYear() !== new Date().getFullYear() ? {year:'numeric'} : {})});
  }
  function isCurrentMember(member) {
    const memberId = String(member?.user_id ?? member?.id ?? '');
    return !!(currentUserId && memberId === currentUserId || currentUsername && typeof member?.username === 'string' && member.username.toLowerCase() === currentUsername.toLowerCase());
  }
  function visibleMembers(item) {
    const members = Array.isArray(item.members) ? item.members : [];
    if (item.category === 'private' && !currentUsername && !currentUserId) return [];
    return members.filter(member=>!isCurrentMember(member));
  }
  function avatarMembers(item) {
    if(item.category!=='private' && item.avatarOwner===avatarAccountKey() && Array.isArray(item.iconMembers))return item.iconMembers;
    const peers=visibleMembers(item);
    if(item.category==='private')return peers.slice(0,1);
    return (peers.length?peers:Array.isArray(item.members)?item.members:[]).slice(0,3);
  }
  function lastChatKey(){
    const account=currentUsername.toLowerCase() || (currentUserId?'id:'+currentUserId:'');
    return account?'tv-chat-last-room-v1:'+account:'';
  }
  function storedRoom(key){
    if(!key)return null;
    try{
      const saved=JSON.parse(localStorage.getItem(key));
      if(!saved || typeof saved.id!=='string' || !/^[\w-]{1,150}$/.test(saved.id) || typeof saved.private!=='boolean')return null;
      if(!saved.private && !['bitcoin','general'].includes(saved.id))return null;
      return saved;
    }catch{return null;}
  }
  function rememberRoom(){
    try{
      const saved=JSON.stringify({id:room.id,private:room.private}),key=lastChatKey();
      if(key)localStorage.setItem(key,saved);
      if(!room.private)localStorage.setItem('tv-chat-last-public-v1',saved);
    }catch{/* Chat remains usable when browser storage is unavailable. */}
  }
  async function restoreRoom(){
    try{
      await identityReady;
      if(stopped || selectionGeneration || listVisible)return;
      if(!lastChatKey())await loadChats({avatars:false});
      if(stopped || selectionGeneration || listVisible)return;
      const owner=lastChatKey(),saved=storedRoom(owner) || storedRoom('tv-chat-last-public-v1');
      if(saved?.private){
        if(!listLoaded)await loadChats({avatars:false});
        if(stopped || selectionGeneration || listVisible || owner!==lastChatKey())return;
        if(!rooms.has(saved.id) && lastChatCount>=chatLimit){
          try{
            const info=await request('/chats/info/?room_id='+encodeURIComponent(saved.id));
            if(stopped || selectionGeneration || listVisible || owner!==lastChatKey())return;
            if(String(info?.room?.room_id)===saved.id)upsertChat(info.room);
          }catch{/* A missing conversation falls back to the last public room. */}
        }
        const selected=rooms.get(saved.id);
        if(selected?.private)room=selected;
        else {const fallback=storedRoom('tv-chat-last-public-v1');if(fallback)room=rooms.get(fallback.id)||room;}
      }else if(saved)room=rooms.get(saved.id)||room;
      renderRoomHeader();
    }finally{
      initializing=false;
      if(!stopped && selectionGeneration)rememberRoom();
      if(!stopped && !selectionGeneration && !listVisible){refresh();if(room.private)updateRoomMetadata();}
    }
  }
  function avatarAccountKey(){return currentUserId+'|'+currentUsername.toLowerCase();}
  async function refreshChatAvatars(items){
    const groups=items.filter(item=>item.private && item.category!=='private');if(!groups.length || stopped)return;
    const generation=avatarGeneration;
    let native;
    try{native=await chrome.runtime.sendMessage({kind:'tv-chat-avatar-data',tabId:targetTabId,roomIds:groups.map(item=>item.id)});}catch{}
    if(stopped || generation!==avatarGeneration)return;
    if(native?.available && native.identity?.username)applyIdentity(native.identity);
    const owner=avatarAccountKey(),activeGeneration=avatarGeneration,byId=new Map(groups.map(item=>[item.id,item])),matched=new Set();
    const usable=member=>member && typeof member.username==='string' && /^[\w.-]{1,50}$/.test(member.username);
    const update=(item,members,source)=>{
      const valid=members.filter(usable),peers=valid.filter(m=>!isCurrentMember(m));
      const selected=(peers.length?peers:valid).slice(0,3);if(!selected.length)return false;
      item.iconMembers=selected;item.avatarOwner=owner;item.avatarSource=source;item.avatarChecked=Date.now();return true;
    };
    if(native?.available && Array.isArray(native.rooms))for(const entry of native.rooms){
      const item=byId.get(entry?.roomId);if(item && Array.isArray(entry.members) && update(item,entry.members,'native'))matched.add(item.id);
    }
    if(listVisible)renderDirectory();else renderRoomHeader();
    const pending=groups.filter(item=>!matched.has(item.id) && !(item.avatarSource==='members' && item.avatarOwner===owner && Date.now()-item.avatarChecked<30000));
    let cursor=0;
    await Promise.all(Array.from({length:Math.min(3,pending.length)},async()=>{
      while(cursor<pending.length){
        const item=pending[cursor++];if(stopped || activeGeneration!==avatarGeneration || owner!==avatarAccountKey())return;
        try{
          const data=await request('/chats/get/members/?'+new URLSearchParams({room_id:item.id,page:'1',page_size:'4'}));
          if(stopped || activeGeneration!==avatarGeneration || owner!==avatarAccountKey() || rooms.get(item.id)!==item)return;
          if(Array.isArray(data?.results) && update(item,data.results,'members')){if(listVisible)renderDirectory();else if(room.id===item.id)renderRoomHeader();}
        }catch{/* Keep only this room's summary as the fallback; never copy a different room's icon. */}
      }
    }));
  }
  function displayChatTitle(item) {
    const peers = visibleMembers(item).map(m=>m.username).filter(name=>typeof name==='string' && name);
    if (item.category === 'private') return peers[0] || 'Private chat';
    return item.customTitle || peers.join(', ') || 'Group chat';
  }
  function applyIdentity(identity) {
    if (stopped || !identity || typeof identity !== 'object') return;
    if (typeof identity.username==='string' && identity.username.toLowerCase()==='guest' && !identity.userId) return;
    const username = /^[\w.-]{1,50}$/.test(identity.username || '') ? identity.username : currentUsername;
    const userId = /^\d{1,20}$/.test(String(identity.userId ?? '')) ? String(identity.userId) : currentUserId;
    if (username === currentUsername && userId === currentUserId) return;
    avatarGeneration++;
    for(const item of rooms.values()){delete item.iconMembers;delete item.avatarOwner;delete item.avatarChecked;delete item.avatarSource;}
    currentUsername = username; currentUserId = userId;
    for (const item of rooms.values()) if (item.private) item.title = displayChatTitle(item);
    renderRoomHeader();
    if (listVisible) renderDirectory(); else if (messages.size) render();
  }
  function upsertChat(chat) {
    if (!chat || !/^[\w-]{1,150}$/.test(String(chat.room_id ?? ''))) return null;
    const id = String(chat.room_id); if (['bitcoin','general'].includes(id)) return null;
    const members = Array.isArray(chat.first_members_info) ? chat.first_members_info : [];
    // The native client treats a two-member chat without a custom title as a direct chat.
    const category = Number(chat.members_count) === 2 && !chat.title ? 'private' : 'groups';
    const item = rooms.get(id) || {id};
    Object.assign(item,{customTitle:typeof chat.title === 'string'?chat.title:'',category,private:true,membersCount:chat.members_count,members,lastMessage:typeof chat.last_message === 'string' ? chat.last_message : '',updated:chat.updated,unread:Math.max(0,Number(chat.new_msgs)||0)});
    item.title = displayChatTitle(item);
    rooms.set(id,item); return item;
  }
  function renderDirectory() {
    root.querySelectorAll('[data-category]').forEach(tab=>{const selected=tab.dataset.category===listCategory;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    const rows = [...rooms.values()].filter(r=>(r.category || (r.private?'groups':'public'))===listCategory);
    if (listCategory !== 'public') rows.sort((a,b)=>(chatTime(b.updated).getTime()||0)-(chatTime(a.updated).getTime()||0));
    const fragment = document.createDocumentFragment();
    for (const item of rows) {
      const row = document.createElement('button'); row.type='button'; row.className='chat-row'; row.dataset.chatId=item.id;
      const avatar=document.createElement('span'); avatar.className='list-avatar';
      const members=avatarMembers(item);
      if (!members.length) avatar.textContent=item.title.slice(0,1).toUpperCase();
      else { avatar.classList.toggle('composite',members.length>1); for(const m of members){const slot=document.createElement('span');slot.className='room-avatar-slot';picture(slot,m.user_pic,'',m.username);avatar.append(slot);} }
      const body=document.createElement('span');body.className='chat-row-body';
      const title=document.createElement('span');title.className='chat-row-title';title.textContent=item.title;
      const preview=document.createElement('span');preview.className='chat-row-preview';
      preview.textContent=String(item.lastMessage || (item.private?'':'Public room')).replace(/\[\/?quote[^\]]*\]/gi,'').replace(/\s+/g,' ').replace(emojiPattern,code=>shortcode.get(code)||code).slice(0,500);
      body.append(title,preview);
      const side=document.createElement('span');side.className='chat-row-side';
      const time=document.createElement('span');time.className='chat-row-time';time.textContent=listTime(item.updated);side.append(time);
      if(item.unread>0){const unread=document.createElement('span');unread.className='unread';unread.textContent=item.unread>99?'99+':String(Math.floor(item.unread));unread.setAttribute('aria-label',`${Math.floor(item.unread)} unread messages`);side.append(unread);}
      row.append(avatar,body,side);row.addEventListener('click',()=>openChat(item));fragment.append(row);
    }
    if(!rows.length && !listLoading){const empty=document.createElement('p');empty.className='directory-empty';empty.textContent=listCategory==='private'?'No private conversations returned.':listCategory==='groups'?'No group chats returned.':'No public rooms available.';fragment.append(empty);}
    $('chat-rows').replaceChildren(fragment);
    $('more-chats').hidden=listCategory==='public'||!listLoaded||lastChatCount<chatLimit||chatLimit>=500;
    $('more-chats').disabled=listLoading;
  }
  function directoryStatus(text,error=false){$('directory-state').textContent=text;$('directory-state').hidden=!text;$('directory-state').classList.toggle('error',error);}
  async function loadChats({avatars=true}={}) {
    if(stopped)return;
    if(listLoading){listRefreshQueued=true;return;}
    listLoading=true;directoryStatus(listLoaded?'':'Loading chats…');renderDirectory();
    try{
      await identityReady;
      const data=await request('/chats/get/?limit='+chatLimit);
      if(stopped)return;
      if(!Array.isArray(data))throw Error('Chat list is unavailable. Check your TradingView sign-in.');
      const commonAccount=TVChatIdentity.fromChats(data);
      if(commonAccount.username) applyIdentity(commonAccount);
      const returned=new Set();for(const chat of data){const item=upsertChat(chat);if(item)returned.add(item.id);}
      for(const [id,item] of rooms)if(item.private&&!returned.has(id))rooms.delete(id);
      lastChatCount=data.length;listLoaded=true;directoryStatus('');
      renderDirectory();if(avatars)await refreshChatAvatars([...rooms.values()].filter(item=>returned.has(item.id)));
    }catch(error){if(!stopped)directoryStatus(error.message,true);}
    finally{listLoading=false;if(!stopped){renderDirectory();if(listRefreshQueued){listRefreshQueued=false;queueDirectoryRefresh();}}}
  }
  function queueDirectoryRefresh(){
    if(stopped||!listVisible||listCategory==='public'||document.hidden||directoryTimer!==null)return;
    directoryTimer=setTimeout(()=>{directoryTimer=null;loadChats();},250);
  }
  function showDirectory(){
    if(listVisible)return;
    closePickers();conversationScroll=$('feed').scrollTop;listVisible=true;clearTimeout(timer);clearTimeout(pushTimer);pushTimer=null;
    listCategory=room.category||(room.private?'groups':'public');
    $('conversation').hidden=true;$('chat-directory').hidden=false;$('rooms-toggle').setAttribute('aria-expanded','true');
    $('latest').hidden=true;$('date-marker').hidden=true;directoryStatus('');renderDirectory();
    if(listCategory!=='public')loadChats();
  }
  function hideDirectory(refreshFeed=true){
    if(!listVisible)return;
    listVisible=false;clearTimeout(directoryTimer);directoryTimer=null;
    $('chat-directory').hidden=true;$('conversation').hidden=false;$('rooms-toggle').setAttribute('aria-expanded','false');
    $('feed').scrollTop=conversationScroll;renderRoomHeader();updateLatest();
    if(refreshFeed){if(reading)refreshQueued=true;else refresh();}
  }
  function openChat(item){
    if(item.id===room.id){selectionGeneration++;rememberRoom();hideDirectory();return;}
    if(capturing){directoryStatus('Wait for the chart snapshot before changing conversations.',true);return;}
    if(sending||pending){directoryStatus('Open '+room.title+' to finish checking the current message before changing chats.',true);return;}
    selectRoom(item);
  }
  root.querySelectorAll('[data-category]').forEach(tab=>{
    tab.addEventListener('click',()=>{listCategory=tab.dataset.category;directoryStatus('');renderDirectory();if(listCategory!=='public')loadChats();});
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const tabs=[...root.querySelectorAll('[data-category]')],index=tabs.indexOf(tab);
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      tabs[next].click();tabs[next].focus();
    });
  });
  $('more-chats').addEventListener('click',()=>{chatLimit=Math.min(500,chatLimit+50);loadChats();});
  $('directory-close').addEventListener('click',()=>{$('close').click();});

  function toggleRooms(open) { if(open)showDirectory();else hideDirectory(); }
  $('rooms-toggle').addEventListener('click',showDirectory);
  document.addEventListener('keydown',event => { if (event.key === 'Escape') { toggleRooms(false); const pickerOpen = !$('emoji-picker').hidden; closePickers(); if (pickerOpen) $('draft').focus(); } });
  $('close').addEventListener('click', () => {
    stop(); chrome.runtime.sendMessage({kind:'tv-chat-close',tabId:targetTabId}).catch(() => {});
  });
  window.addEventListener('pagehide',stop,{once:true});
  function visibility() { if(initializing)return; if (document.hidden) clearTimeout(timer); else if(listVisible)queueDirectoryRefresh(); else refresh(); }
  document.addEventListener('visibilitychange', visibility);
  renderRoomHeader(); restoreRoom();
})();
