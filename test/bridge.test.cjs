const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

function fixture() {
  const sockets = [], intervals = new Set();
  let microphoneResolve, stopped = 0, bufferSize;
  class Socket {
    static CONNECTING = 0; static OPEN = 1;
    readyState = 0;
    constructor(url) { this.url = url; sockets.push(this); }
    close(code) { this.readyState = 3; this.onclose?.({ code }); }
    send() {}
    open() { this.readyState = 1; this.onopen(); }
  }
  const source = fs.readFileSync('packages/voice-avatar-bridge/src/index.ts', 'utf8');
  const js = stripTypeScriptTypes(source, { mode: 'transform' })
    .replace(/export default \{[^}]+\};?/, '')
    .replace(/export (class|function) /g, '$1 ');
  const context = vm.createContext({
    URL, WebSocket: Socket, setTimeout, clearTimeout,
    setInterval(fn) { const id = {}; intervals.add(id); return id; },
    clearInterval(id) { intervals.delete(id); },
    cancelAnimationFrame() {}, requestAnimationFrame() { return 1; },
    navigator: { mediaDevices: { getUserMedia() { return new Promise(resolve => { microphoneResolve = resolve; }); } } },
    AudioContext: class {
      destination = {};
      createMediaStreamSource() { return { connect() {} }; }
      createScriptProcessor(size) {
        assert.ok([256,512,1024,2048,4096,8192,16384].includes(size));
        bufferSize = size;
        return { connect() {}, disconnect() {} };
      }
      close() {}
    },
  });
  vm.runInContext(js + '\nthis.Bridge = VoiceAvatarBridge;', context);
  return { Bridge: context.Bridge, sockets, intervals,
    grantMic() { microphoneResolve({ getTracks: () => [{ stop() { stopped++; } }] }); },
    get stopped() { return stopped; }, get bufferSize() { return bufferSize; } };
}

test('voice connection preserves existing parameters and encodes tenant and agent', () => {
  const f = fixture();
  const bridge = new f.Bridge({ url: 'wss://voice.example/ws?session=opaque', tenant: 'a&tenant=other', agent: 'fr?x=1' });
  const url = new URL(f.sockets[0].url);
  assert.equal(url.searchParams.get('session'), 'opaque');
  assert.equal(url.searchParams.get('tenant'), 'a&tenant=other');
  assert.equal(url.searchParams.get('agent'), 'fr?x=1');
  bridge.connect();
  assert.equal(f.sockets.length, 1, 'connecting sockets are not duplicated');
  bridge.disconnect();
});

test('disconnect and unexpected close release keepalive timers', () => {
  for (const manual of [true, false]) {
    const f = fixture();
    const bridge = new f.Bridge({ url: 'wss://voice.example/ws', tenant: 'demo', autoReconnect: false });
    f.sockets[0].open();
    assert.equal(f.intervals.size, 1);
    if (manual) bridge.disconnect(); else f.sockets[0].close(1006);
    assert.equal(f.intervals.size, 0);
    assert.equal(bridge.getState(), 'disconnected');
  }
});

test('microphone permission arriving after disconnect immediately releases tracks', async () => {
  const f = fixture();
  const bridge = new f.Bridge({ url: 'wss://voice.example/ws', tenant: 'demo' });
  f.sockets[0].open();
  const pending = bridge.startMicrophone();
  bridge.disconnect();
  f.grantMic();
  await pending;
  assert.equal(f.stopped, 1);
});

test('invalid protocols and credentials are rejected before opening a socket', () => {
  for (const url of ['https://voice.example/ws', 'wss://user:pass@voice.example/ws']) {
    const f = fixture();
    assert.throws(() => new f.Bridge({ url, tenant: 'demo' }));
    assert.equal(f.sockets.length, 0);
  }
});

test('default microphone chunk uses a valid browser audio buffer and releases its stream', async () => {
  const f = fixture();
  const bridge = new f.Bridge({ url: 'wss://voice.example/ws', tenant: 'demo' });
  f.sockets[0].open();
  const pending = bridge.startMicrophone();
  f.grantMic();
  await pending;
  assert.equal(f.bufferSize, 2048);
  assert.equal(bridge.getState(), 'listening');
  bridge.disconnect();
  assert.equal(f.stopped, 1);
});
