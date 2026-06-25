import SuperApp = require('..');

const bridge: SuperApp.Bridge = window.superapp;

bridge.setDefaultMeta({
  miniAppId: 'wallet',
  locale: 'en-MY',
});

bridge.call<{ name: string }>(
  'account',
  'getProfile',
  { includeAvatar: true },
  {
    meta: {
      miniAppId: 'loyalty',
      theme: 'dark',
    },
  },
);

const unsubscribe = bridge.addListener<{ value: number }>(
  'counterChanged',
  (data) => {
    data.value.toFixed();
  },
);

unsubscribe();
window.lib.superapp.clearDefaultMeta();
window.SuperAppChannel?.postMessage('{}');
