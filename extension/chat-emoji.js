(() => {
  'use strict';
  // Compatibility names checked against TradingView's native list on 2026-10-26:
  // https://static.tradingview.com/static/bundles/5156.5448cb9118d7ab20e7a8.js
  // Use local Unicode equivalents; do not load or execute TradingView's bundle.
  const entries = [
    [':agree:','👍','Agree'], [':disagree:','👎','Disagree'], [':okay:','👌','Okay'], [':peace:','✌️','Peace'], [':wait:','☝️','Wait'], [':wave:','👋','Wave'], [':raised_hands:','🙌','Raised hands'], [':pray:','🙏','Pray'],
    [':)','🙂','Smile'], [':D','😄','Big smile'], [':joy:','😂','Joy'], [';)','😉','Wink'], [':love:','😍','Love'], [':P','😛','Tongue out'], [':flushed:','😳','Flushed'], [':|','😐','Neutral'], [':thinking_face:','🤔','Thinking'], [':(','🙁','Sad'], [':weary:','😩','Weary'], [":'(",'😢','Tear'], [':cry:','😭','Crying'], [':panic:','😱','Panic'], [':rage:','😡','Rage'], [':triumph:','😤','Triumph'], [':mask:','😷','Mask'], [':shades:','😎','Shades'], [':sleepy:','😪','Sleepy'], ['o_O','😵','Confused'], [':halo:','😇','Halo'], [':sarcasm:','😏','Sarcasm'], [']:-)','😈','Devil'], [':money_mouth:','🤑','Money mouth'], [':zzz:','💤','Sleep'],
    [':buy:','🟢','Buy'], [':sell:','🔴','Sell'], [':profit:','💰','Profit'], [':loss:','💸','Loss'], [':uptrend:','📈','Uptrend'], [':downtrend:','📉','Downtrend'], [':bear:','🐻','Bear'], [':bull:','🐂','Bull'], [':dollar:','💵','Dollar'], [':euro:','💶','Euro'], [':pound:','💷','Pound'], [':yen:','💴','Yen'], [':bitcoin:','₿','Bitcoin'], [':ethereum:','Ξ','Ethereum'], [':moneybag:','💰','Money bag'],
    [':cookie:','🍪','Cookie'], [':coffee:','☕','Coffee'], [':popcorn:','🍿','Popcorn'], [':cocktail:','🍸','Cocktail'], [':hot:','🔥','Hot'], [':poop:','💩','Poop'], [':heart:','❤️','Heart'], [':heartbroken:','💔','Broken heart'], [':sun:','🌞','Sun face'], [':moon:','🌙','Moon'], [':sunflower:','🌻','Sunflower'], [':star:','⭐','Star'], [':sunny:','☀️','Sunny'], [':partly_sunny:','⛅','Partly sunny'], [':cloud:','☁️','Cloud'], [':zap:','⚡','Lightning'], [':hammer:','🔨','Hammer'], [':idea:','💡','Idea'], [':slot_machine:','🎰','Slot machine'], [':bullseye:','🎯','Bullseye'], [':rocket:','🚀','Rocket'], [':inverted_rocket:','🚀','Inverted rocket'], [':checkered_flag:','🏁','Checkered flag'], [':alarm_clock:','⏰','Alarm clock'], [':rip:','🪦','Rest in peace'], [':ghost:','👻','Ghost'], [':up:','🆙','Up'], [':cool:','🆒','Cool'], [':free:','🆓','Free'], [':sos:','🆘','SOS'], [':100:','💯','One hundred'], [':stop:','🛑','Stop'], [':credit_card:','💳','Credit card'], [':new:','🆕','New'], [':ok:','🆗','OK'], [':tip:','💡','Tip']
  ].map(([code,emoji,label]) => Object.freeze({code,emoji,label}));
  const byCode = new Map(entries.map(e => [e.code,e]));
  const preferred = new Map();
  // Prefer named codes over punctuation shortcuts when a picker glyph has both.
  for (const e of entries) if (!preferred.has(e.emoji) || /^:.*:$/.test(e.code)) preferred.set(e.emoji,e.code);
  // Preserve the ordinary upright rocket as the picker default.
  preferred.set('🚀',':rocket:');
  globalThis.TVChatEmoji = Object.freeze({entries:Object.freeze(entries),get:code=>byCode.get(code),codeFor:emoji=>preferred.get(emoji)});
})();
