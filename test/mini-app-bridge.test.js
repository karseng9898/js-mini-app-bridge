const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const bridgeSource = fs.readFileSync(
  path.join(__dirname, '..', 'mini-app-bridge.js'),
  'utf8',
);

function loadBridge() {
  const postedMessages = [];
  const logs = [];
  const domListeners = {};
  const window = {
    lib: {},
    SuperAppChannel: {
      postMessage(message) {
        postedMessages.push(JSON.parse(message));
      },
    },
  };
  window.window = window;

  const context = {
    window,
    document: {
      readyState: 'loading',
      addEventListener(eventName, listener) {
        domListeners[eventName] = listener;
      },
    },
    console: {
      log(...args) {
        logs.push(['log', ...args]);
      },
      error(...args) {
        logs.push(['error', ...args]);
      },
      warn(...args) {
        logs.push(['warn', ...args]);
      },
    },
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(bridgeSource, context, {
    filename: 'mini-app-bridge.js',
  });

  return {
    bridge: window.superapp,
    domListeners,
    libBridge: window.lib.superapp,
    logs,
    postedMessages,
  };
}

async function completeLatestCall(state, response = { ok: true }) {
  const payload = state.postedMessages.at(-1);
  state.bridge.handleSuccess(payload.id, response);
  return payload;
}

test('exposes version 1.0.2 through both browser globals', () => {
  const state = loadBridge();

  assert.equal(state.bridge.version, '1.0.2');
  assert.equal(state.bridge, state.libBridge);
});

test('omits metadata when none is configured', async () => {
  const state = loadBridge();
  const call = state.bridge.call('account', 'getProfile', {});
  const payload = await completeLatestCall(state);
  await call;

  assert.equal(Object.hasOwn(payload, 'meta'), false);
});

test('merges default and per-call metadata with per-call precedence', async () => {
  const state = loadBridge();
  state.bridge.setDefaultMeta({
    miniAppId: 'wallet',
    locale: 'en-MY',
  });

  const call = state.bridge.call('account', 'getProfile', {}, {
    meta: {
      miniAppId: 'loyalty',
      theme: 'dark',
    },
  });
  const payload = await completeLatestCall(state);
  await call;

  assert.deepEqual(
    JSON.parse(JSON.stringify(payload.meta)),
    {
      miniAppId: 'loyalty',
      locale: 'en-MY',
      theme: 'dark',
    },
  );
});

test('accepts custom metadata and redacts credential-like values from logs', async () => {
  const state = loadBridge();
  state.bridge.setDefaultMeta({
    miniAppId: 'wallet',
    accessToken: 'top-secret',
  });

  const call = state.bridge.call('account', 'getProfile');
  await completeLatestCall(state);
  await call;

  const serializedLogs = JSON.stringify(state.logs);
  assert.match(serializedLogs, /\[REDACTED\]/);
  assert.doesNotMatch(serializedLogs, /top-secret/);
});

test('rejects non-object metadata', async () => {
  const state = loadBridge();

  await assert.rejects(
    state.bridge.call('account', 'getProfile', {}, { meta: 'wallet' }),
    /options\.meta must be an object/,
  );
  assert.equal(state.postedMessages.length, 0);
});
