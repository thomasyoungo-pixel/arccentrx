// Offline regression tests: node --test tests/contact-tracking.test.cjs
// No real inquiry, CRM request, or analytics event is sent.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/site.js'), 'utf8');

function setup(options = {}) {
  const listeners = {};
  const events = [];
  const store = new Map();
  const requests = [];
  const note = { textContent: '', style: {} };
  const button = { disabled: false };
  let resets = 0;
  const form = {
    elements: { company_website: { value: options.honeypot || '' },
      name: { value: 'Test Person' }, email: { value: 'test@example.invalid' },
      subject: { value: 'Private subject' }, message: { value: 'Private message' } },
    querySelector: selector => selector === '.form-note' ? note : button,
    addEventListener: (name, callback) => { listeners['form:' + name] = callback; },
    checkValidity: () => options.valid !== false,
    reportValidity() {},
    reset() { resets++; }
  };
  const storage = {
    setItem(key, value) { if (options.storageBlocked) throw new Error('blocked'); store.set(key, value); },
    getItem(key) { if (options.storageBlocked) throw new Error('blocked'); return store.get(key) || null; },
    removeItem(key) { if (options.storageBlocked) throw new Error('blocked'); store.delete(key); }
  };
  const context = {
    console, Date, JSON, sessionStorage: storage,
    document: {
      body: { getAttribute: () => 'contact' },
      head: { appendChild() {} },
      createElement: () => ({}),
      querySelector: selector => selector === '[data-contact-form]' ? form : null,
      querySelectorAll: () => [],
      addEventListener: (name, callback) => { listeners[name] = callback; }
    },
    window: { addEventListener() {}, scrollY: 0 },
    fetch(url, request) {
      requests.push({ url, request });
      if (options.reject) return Promise.reject(new Error('offline'));
      if (options.deferred) return options.deferred;
      return Promise.resolve({ ok: options.httpOK !== false, status: 502,
        json: () => Promise.resolve(options.response === undefined ? { ok: true } : options.response) });
    }
  };
  // In a browser window is the global object; mirror that in the VM.
  Object.assign(context, context.window);
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  context.window.gtag = (...args) => events.push(args);
  if (options.noAnalytics) delete context.window.gtag;
  function click(placement = 'hero') {
    let prevented = false;
    const link = { getAttribute: name => name === 'data-contact-source' ? 'firm_overview' : placement };
    listeners.click({ target: { closest: () => link }, preventDefault() { prevented = true; } });
    assert.equal(prevented, false, 'contact link must retain native navigation');
  }
  function submit() { listeners['form:submit']({ preventDefault() {} }); }
  const settle = () => new Promise(resolve => setImmediate(resolve));
  return { events, store, requests, note, button, click, submit, settle, resets: () => resets };
}

test('overview CTA preserves wording and uses a wrapping, visible touch-sized contact button', () => {
  const html = fs.readFileSync(path.join(__dirname, '../go/firm-overview.html'), 'utf8');
  assert.match(html, /class="btn btn-bright-teal overview-contact-action" href="\/contact\.html"/);
  assert.match(html, /Discuss your transformation priorities <span/);
  assert.match(html, /min-height: 48px/);
  assert.match(html, /max-width: 100%/);
  assert.match(html, /white-space: normal/);
  assert.doesNotMatch(html, /overview-contact-action reveal/);
  assert.match(html, /arccentrx-firm-overview\.pdf/);
});

test('CTA click emits navigation event only, never generate_lead', () => {
  for (const placement of ['hero', 'footer']) {
    const s = setup(); s.click(placement);
    assert.equal(s.events.length, 1);
    assert.equal(s.events[0][1], 'contact_cta_click');
    assert.equal(s.events[0][2].cta_placement, placement);
    assert.equal(s.events[0][2].link_path, '/contact.html');
  }
});

test('confirmed inquiry fires one attributed lead, without personal data', async () => {
  const s = setup(); s.click(); s.submit();
  assert.equal(s.button.disabled, true);
  await s.settle();
  const leads = s.events.filter(event => event[1] === 'generate_lead');
  assert.equal(leads.length, 1);
  assert.equal(leads[0][2].inquiry_source, 'firm_overview');
  assert.equal(leads[0][2].form_id, 'contact_inquiry');
  assert.deepEqual(Object.keys(leads[0][2]).sort(), ['form_id', 'inquiry_source', 'transport_type']);
  assert.doesNotMatch(JSON.stringify(s.events), /test@example|Private|Test Person/);
  assert.equal(s.resets(), 1);
  assert.equal(s.store.size, 0);
  assert.equal(s.button.disabled, false);
  assert.equal(s.requests[0].url, '/.netlify/functions/whitepaper');
});

test('direct contact inquiry is not falsely attributed to overview', async () => {
  const s = setup(); s.submit(); await s.settle();
  assert.equal(s.events[0][2].inquiry_source, 'contact');
});

test('invalid form, honeypot, network failure, HTTP failure and unconfirmed response produce no lead', async () => {
  for (const options of [{ valid: false }, { honeypot: 'bot' }, { reject: true },
    { httpOK: false }, { response: { ok: false } }, { response: {} }, { response: null }]) {
    const s = setup(options); s.submit(); await s.settle();
    assert.equal(s.events.length, 0, JSON.stringify(options));
    assert.equal(s.button.disabled, false);
  }
});

test('duplicate submission while pending cannot send duplicate request or lead', async () => {
  let resolve;
  const deferred = new Promise(r => { resolve = r; });
  const s = setup({ deferred }); s.submit(); s.submit();
  assert.equal(s.requests.length, 1);
  resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
  await s.settle();
  assert.equal(s.events.length, 1);
});

test('blocked storage and absent analytics never prevent inquiry submission', async () => {
  const s = setup({ storageBlocked: true, noAnalytics: true });
  s.click(); s.submit(); await s.settle();
  assert.equal(s.resets(), 1);
  assert.equal(s.requests.length, 1);
});

test('expired or malformed attribution cannot label an inquiry as overview-sourced', async () => {
  for (const value of ['broken', JSON.stringify({ source: 'firm_overview', time: 0 }),
    JSON.stringify({ source: 'firm_overview', time: Date.now() + 86400000 })]) {
    const s = setup(); s.store.set('arccentrx_contact_source', value);
    s.submit(); await s.settle();
    assert.equal(s.events[0][2].inquiry_source, 'contact');
  }
});
