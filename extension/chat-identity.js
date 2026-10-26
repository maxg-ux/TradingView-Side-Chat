(() => {
  'use strict';
  const validName = value => typeof value === 'string' && /^[\w.-]{1,50}$/.test(value);
  function clean(user) {
    if (!user || !validName(user.username)) return {};
    const id = String(user.user_id ?? user.id ?? '');
    return {username:user.username,userId:/^\d{1,20}$/.test(id) ? id : ''};
  }
  function fromDocument(doc) {
    // TradingView includes `var is_authenticated = true; var user = {...}` in page data.
    // Parse JSON only: never evaluate scripts, and return only the two display-identity fields.
    for (const script of doc.querySelectorAll('script:not([src])')) {
      const text = script.textContent || '';
      if (text.length > 1000000 || !/\b(?:var\s+|window\.)is_authenticated\s*=\s*true\b/.test(text)) continue;
      const assignment = /\b(?:var\s+user|window\.user)\s*=\s*(\{)/.exec(text);
      if (!assignment) continue;
      const start = assignment.index + assignment[0].lastIndexOf('{');
      let depth=0,quoted=false,escaped=false;
      for (let i=start;i<text.length;i++) {
        const char=text[i];
        if (quoted) { if (escaped) escaped=false; else if(char==='\\') escaped=true; else if(char==='"') quoted=false; continue; }
        if (char==='"') quoted=true;
        else if (char==='{') depth++;
        else if (char==='}' && --depth===0) {
          try { const identity=clean(JSON.parse(text.slice(start,i+1))); if(identity.username)return identity; } catch { /* Invalid/non-JSON assignment is not executed. */ }
          break;
        }
      }
    }
    return {};
  }
  function fromChats(chats) {
    // An account's distinct one-to-one conversations share exactly one participant: that account.
    // Require two different complete pairs and one unique common name; duplicate/ambiguous pairs prove nothing.
    const pairs=[],seen=new Set();
    for (const chat of Array.isArray(chats)?chats:[]) {
      if (Number(chat?.members_count)!==2 || chat.title || !Array.isArray(chat.first_members_info)) continue;
      const members=chat.first_members_info.filter(m=>validName(m?.username));
      const names=new Set(members.map(m=>m.username.toLowerCase()));
      if (names.size!==2 || members.length!==2) continue;
      const key=[...names].sort().join('|');if(seen.has(key))continue;seen.add(key);pairs.push({members,names});
    }
    if(pairs.length<2)return {};
    const common=[...pairs[0].names].filter(name=>pairs.every(pair=>pair.names.has(name)));
    if(common.length!==1)return {};
    return clean(pairs[0].members.find(m=>m.username.toLowerCase()===common[0]));
  }
  globalThis.TVChatIdentity=Object.freeze({fromDocument,fromChats});
})();
