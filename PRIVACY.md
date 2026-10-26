# Privacy and permissions

The extension runs against `https://www.tradingview.com` after its toolbar button is clicked. It uses the browser’s existing signed-in session for TradingView’s own chat and snapshot requests.

## Permissions

- **activeTab:** temporary access to the TradingView tab selected by a toolbar click.
- **scripting:** installs the dock/bridge and invokes TradingView’s native chart snapshot action in that tab.

The only web-accessible resource is `panel.html`, restricted to TradingView pages. There is no broad host permission, clipboard permission, browser-history permission or desktop-capture permission.

## Data handling

Messages and room/member metadata are fetched from TradingView through constrained routes. Public profile pictures and snapshot images load from TradingView domains. Snapshot capture uses TradingView’s own chart renderer and snapshot hosting; it does not capture desktop applications or browser controls. Sending a message or snapshot transfers it to TradingView under the user’s own account and the destination chat’s rules.

The extension reads the current public username/user ID to choose the peer in direct chats and scope the remembered conversation. Local storage contains the last room ID/type keyed to the account identity. Drafts and loaded messages are held in memory, not persisted by this extension. Native account/room/avatar caches are read only for display; passwords, cookie strings and session tokens are not exported.

There is no separate chat server, added analytics service, local-photo uploader or collection endpoint operated by this project. The existing TradingView website may run its own requests and analytics independently.

Uninstalling the extension removes its normal extension-origin settings through the browser. TradingView’s own server-side messages and snapshots are controlled by TradingView, not by uninstalling this extension.
