# mini-app-bridge

Browser JavaScript bridge for Mini Apps to call Flutter SuperApp methods through `window.SuperAppChannel`.

## Installation

```bash
npm install js-mini-app-bridge-plus@1.0.2
```

Or load the browser bundle:

```html
<script src="https://unpkg.com/js-mini-app-bridge-plus@1.0.2/mini-app-bridge.min.js"></script>
```

## Usage

Set metadata that should be included with every bridge request:

```js
window.superapp.setDefaultMeta({
  miniAppId: "wallet"
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
    "miniAppId": "wallet"
  }
}
```

Metadata is optional. Per-call metadata overrides matching defaults and may include custom keys:

```js
await window.superapp.call(
  "account",
  "getProfile",
  {},
  {
    meta: {
      miniAppId: "loyalty",
      locale: "en-MY"
    }
  }
);
```

## API

- `superapp.call(className, methodName, params?, options?)`: calls a Flutter bridge method. Use `options.meta` for optional per-call metadata.
- `superapp.setDefaultMeta(meta?)`: sets metadata sent with every bridge request.
- `superapp.getDefaultMeta()`: returns configured default metadata.
- `superapp.clearDefaultMeta()`: clears configured default metadata.
- `superapp.addListener(eventName, callback)`: subscribes to events from Flutter and returns an unsubscribe function.
- `superapp.removeListener(eventName, callback)`: removes an event listener.
- `superapp.getParams(key?)`: reads parameters sent by the SuperApp.

Credential-like values are redacted from bridge logs.
