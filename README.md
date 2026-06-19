# mini-app-bridge

Browser JavaScript bridge for Mini Apps to call Flutter SuperApp methods through `window.SuperAppChannel`.

## Usage

```html
<script src="https://unpkg.com/js-mini-app-bridge-plus@1.0.0/mini-app-bridge.min.js"></script>
```

```js
window.superapp.setDefaultMeta({
  miniAppId: "wallet",
  authorization: "Bearer access-token"
});

const result = await window.superapp.call(
  "account",
  "getProfile",
  { includeAvatar: true }
);
```

The bridge sends metadata outside `params`:

```json
{
  "id": "sa_...",
  "className": "account",
  "method": "getProfile",
  "params": { "includeAvatar": true },
  "meta": {
    "miniAppId": "wallet",
    "authorization": "Bearer access-token"
  }
}
```

Per-call metadata can override or extend the default metadata:

```js
await window.superapp.call(
  "account",
  "getProfile",
  {},
  {
    meta: {
      miniAppId: "loyalty",
      authorization: "Bearer loyalty-token"
    }
  }
);
```

## API

- `superapp.call(className, methodName, params?, options?)`: calls a Flutter bridge method. Use `options.meta` for per-call metadata.
- `superapp.setDefaultMeta(meta?)`: sets metadata sent with every bridge request.
- `superapp.getDefaultMeta()`: returns configured default metadata.
- `superapp.clearDefaultMeta()`: clears configured default metadata.
- `superapp.addListener(eventName, callback)`: subscribes to events from Flutter.
- `superapp.removeListener(eventName, callback)`: removes an event listener.
- `superapp.getParams(key?)`: reads parameters sent by the SuperApp.

Sensitive fields such as `authorization`, `token`, `accessToken`, `refreshToken`, `password`, `secret`, `cookie`, and `apiKey` are redacted from bridge logs.