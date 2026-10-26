'use strict';
const isTradingView = url => /^https:\/\/www\.tradingview\.com(?:\/|$)/.test(url || '');
const isPanel = sender => sender.id === chrome.runtime.id && sender.url?.split('?')[0] === chrome.runtime.getURL('panel.html');
const snapshotJobs = new Map();
async function captureNativeChart() {
  const started=typeof performance!=='undefined'?performance.now():0;
  if (location.origin !== 'https://www.tradingview.com') return {ok:false,error:'Open a TradingView chart before taking a snapshot.'};
  try {
    let runtime;
    const chunks = window.webpackChunktradingview;
    if (!Array.isArray(chunks) && typeof chunks?.push !== 'function') throw Error('TradingView chart tools are unavailable. Reload the chart and try again.');
    chunks.push([['tv-chat-snapshot-' + Date.now()],{},value=>{runtime=value;}]);
    let collectionExports=runtime?.c?.[965865]?.exports;
    if(!collectionExports && runtime?.m?.[965865])collectionExports=runtime(965865);
    const collection = collectionExports?.chartWidgetCollectionService?.() || window.TradingViewApi?._chartWidgetCollection;
    if (!collection) throw Error('Open a TradingView chart before taking a snapshot.');
    let snapshot = runtime.c?.[102117]?.exports?.takeChartSnapshotPromise;
    if(typeof snapshot!=='function' && !runtime.m?.[102117] && typeof runtime.e==='function')await runtime.e(97452);
    if (typeof snapshot !== 'function' && runtime.m?.[102117]) snapshot = runtime(102117)?.takeChartSnapshotPromise;
    if (typeof snapshot !== 'function') throw Error('TradingView snapshot tools are unavailable. Reload the chart and try again.');
    let timeout;
    let id;
    try {
      // Same native chart renderer and /snapshot/ upload used by the TradingView chat button.
      id = await Promise.race([
        snapshot(collection,{previews:['thumb'],asyncSave:false}),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Chart snapshot timed out. Your draft is unchanged.')),30000);}),
      ]);
    } finally { clearTimeout(timeout); }
    id = typeof id === 'string' ? id.trim() : '';
    if (!/^[a-zA-Z0-9]{6,16}$/.test(id)) throw Error('TradingView did not return a valid chart snapshot.');
    return {ok:true,url:'https://www.tradingview.com/x/' + id + '/'};
  } catch (error) {
    let status=0;
    try{const entries=performance.getEntriesByName(location.origin+'/snapshot/').filter(entry=>entry.startTime>=started);status=Number(entries.at(-1)?.responseStatus)||0;}catch{}
    const detail=status>=400?'TradingView refused the chart snapshot upload (HTTP '+status+'). Try the chart’s camera button to check whether snapshots are available for this chart. Your draft is unchanged.':'TradingView rejected the chart snapshot. Try the chart’s camera button to check whether snapshots are available for this chart. Your draft is unchanged.';
    return {ok:false,error:typeof error?.message === 'string' ? error.message.slice(0,240) : detail};
  }
}
chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || !isTradingView(tab.url)) {
    await chrome.tabs.create({url:'https://www.tradingview.com/'});
    return;
  }
  try {
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['chat-media.js','chat-identity.js','image-viewer.js','bridge.js','event-bridge.js']});
    try {
      await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',files:['native-push.js']});
    } catch { /* Keep the panel usable through its reconnect fallback. */ }
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['dock.js']});
    await chrome.action.setBadgeText({tabId:tab.id,text:''});
  } catch {
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({ tabId: tab.id, title: 'Reload TradingView and click again' });
  }
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.kind === 'tv-chat-event' && sender.id === chrome.runtime.id && isTradingView(sender.url) && sender.tab?.id) {
    chrome.runtime.sendMessage({kind:'tv-chat-event',tabId:sender.tab.id,event:message.event}).catch(() => {});
    respond({ok:true}); return false;
  }
  if (message?.kind === 'tv-chat-source' && sender.id === chrome.runtime.id && isTradingView(sender.url) && sender.tab?.id) {
    respond({tabId:sender.tab.id}); return false;
  }
  if(message?.kind==='tv-chat-capture-start' && sender.id===chrome.runtime.id && isTradingView(sender.url) && Number.isInteger(sender.tab?.id)){
    const requestId=message.requestId,tabId=sender.tab.id;
    if(typeof requestId!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(requestId))return false;
    const publish=result=>chrome.tabs.sendMessage(tabId,{kind:'tv-chat-capture-result',requestId,...result}).catch(()=>{});
    if(message.photoDataUrl!==undefined){publish({ok:false,error:'File uploads are not supported. Use the chart snapshot button.'});respond({ok:true});return false;}
    if(snapshotJobs.has(tabId)){publish({ok:false,error:'A chart snapshot is still being created. Wait a moment before trying again.'});respond({ok:true});return false;}
    const job=chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:captureNativeChart})
      .then(rows=>rows?.[0]?.result || {ok:false,error:'The browser did not return TradingView’s snapshot result. Your draft is unchanged.'},()=>({ok:false,error:'The browser could not run TradingView’s native snapshot action. Reload the extension and TradingView tab, then try again.'}));
    snapshotJobs.set(tabId,job);publish({phase:'started'});
    job.then(publish).finally(()=>{if(snapshotJobs.get(tabId)===job)snapshotJobs.delete(tabId);});
    respond({ok:true});return false;
  }
  if (!isPanel(sender) || !Number.isInteger(message?.tabId)) return false;
  if (message.kind === 'tv-chat-preview') {
    if(typeof message.url!=='string' || message.url.length>2048){respond({ok:false,error:'Invalid chart snapshot link.'});return false;}
    // Install in the target tab on demand: an older bridge may not know this message.
    (async()=>{
      try {
        await chrome.scripting.executeScript({target:{tabId:message.tabId},files:['chat-media.js','image-viewer.js']});
        const rows=await chrome.scripting.executeScript({target:{tabId:message.tabId},args:[message.url],func:url=>{
          if(location.origin!=='https://www.tradingview.com')return{ok:false,error:'Open images from your TradingView tab.'};
          return globalThis.__tvChatOpenImage?.(url) || {ok:false,error:'The image viewer could not load. Reopen chat from the extension icon.'};
        }});
        return rows?.[0]?.result || {ok:false,error:'TradingView did not return an image viewer response. Reopen chat from the extension icon.'};
      } catch {
        return {ok:false,error:'The TradingView tab could not open the image viewer. Reopen chat from the extension icon on that tab.'};
      }
    })().then(respond);
    return true;
  }
  if (message.kind === 'tv-chat-avatar-data') {
    const roomIds=Array.isArray(message.roomIds)?[...new Set(message.roomIds.filter(id=>typeof id==='string' && /^[\w-]{1,150}$/.test(id)))].slice(0,500):[];
    if(!roomIds.length){respond({available:false});return false;}
    chrome.scripting.executeScript({target:{tabId:message.tabId},world:'MAIN',args:[roomIds],func:ids=>{
      if(location.origin!=='https://www.tradingview.com' || window.is_authenticated===false)return{available:false};
      try{
        let runtime;window.webpackChunktradingview?.push([['tv-chat-avatar-read-'+Date.now()],{},value=>{runtime=value;}]);
        const store=runtime?.c?.[539299]?.exports?.getChatsStore?.();
        const items=store?.getState?.()?.chats?.items;
        if(!Array.isArray(items))return{available:false};
        const user=window.user,username=typeof user?.username==='string'?user.username:'';
        if(!/^[\w.-]{1,50}$/.test(username))return{available:false};
        const wanted=new Set(ids),rooms=[];
        for(const item of items){
          if(!wanted.has(String(item.id)) || !Array.isArray(item.members))continue;
          const members=item.members.filter(m=>typeof m.username==='string' && /^[\w.-]{1,50}$/.test(m.username));
          const peers=members.filter(m=>m.username.toLowerCase()!==username.toLowerCase());
          const selected=(peers.length?peers:members).slice(0,3).map(m=>({username:m.username,user_pic:typeof m.avatarUrl==='string'?m.avatarUrl.slice(0,12000):'',user_id:/^\d{1,20}$/.test(String(m.id??''))?String(m.id):''}));
          if(selected.length)rooms.push({roomId:String(item.id),members:selected});
        }
        return{available:true,identity:{username,userId:/^\d{1,20}$/.test(String(user?.id??''))?String(user.id):''},rooms};
      }catch{return{available:false};}
    }}).then(rows=>respond(rows?.[0]?.result || {available:false}),()=>respond({available:false}));
    return true;
  }
  if (message.kind === 'tv-chat-snapshot') {
    if (snapshotJobs.has(message.tabId)) { respond({ok:false,error:'A chart snapshot is still being created. Wait a moment and try again.'}); return false; }
    const job = chrome.scripting.executeScript({target:{tabId:message.tabId},world:'MAIN',func:captureNativeChart})
      .then(rows=>rows?.[0]?.result || {ok:false,error:'TradingView did not return a chart snapshot.'},()=>({ok:false,error:'The chart connection was lost. Reload TradingView, reopen chat, and try again.'}));
    snapshotJobs.set(message.tabId,job);
    job.finally(()=>{if(snapshotJobs.get(message.tabId)===job)snapshotJobs.delete(message.tabId);});
    job.then(respond); return true;
  }
  if (message.kind === 'tv-chat-identity') {
    (async()=>{
      try {
        const rows=await chrome.scripting.executeScript({target:{tabId:message.tabId},world:'MAIN',func:() => {
          if (location.origin !== 'https://www.tradingview.com' || window.is_authenticated===false) return {};
          const user = window.user;
          return {username:typeof user?.username === 'string' ? user.username.slice(0,50) : '',userId:/^\d{1,20}$/.test(String(user?.id ?? '')) ? String(user.id) : ''};
        }});
        const identity=rows?.[0]?.result;
        if(identity?.username && (identity.username.toLowerCase()!=='guest' || identity.userId)) return identity;
      } catch { /* Opera may not supply MAIN-world values: use ordinary page data below. */ }
      try {
        const identity=await chrome.tabs.sendMessage(message.tabId,{kind:'tv-chat-page-identity'});
        return {username:typeof identity?.username==='string' ? identity.username : '',userId:typeof identity?.userId==='string' ? identity.userId : ''};
      } catch { return {username:'',userId:''}; }
    })().then(respond);
    return true;
  }
  if (!['tv-chat-request','tv-chat-close','tv-chat-watch'].includes(message.kind)) return false;
  chrome.tabs.sendMessage(message.tabId, message).then(respond, () => respond({
    transportOk:false,
    error:'The TradingView connection was lost. Reopen Chat Window from its toolbar icon on the TradingView tab. Check any pending send before retrying.',
  }));
  return true;
});
