const events = require('events');
const {EventEmitter} = events;
const url = require('url');
const parse5 = require('parse5');
const jszip = require('jszip/dist/jszip.js');
// const randomstring = require('randomstring');

const g = typeof global !== 'undefined' ? global : window;

const nsite = (u, t) => {
  const loader = new EventEmitter();

  // const id = randomstring.generate(7);
  const id = Math.random().toString(36).substring(7);
  const zip = new jszip();

  let current = 0;
  let total = 1;
  let message = 'Initializing...';
  const _checkDone = () => {
    loader.emit('progress', {
      progress: current / total,
      message,
    });

    if (current === total) {
      zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9,
        },
      })
        .then(data => {
          loader.emit('end', {
            id,
            data,
          });
        })
        .catch(err => {
          loader.emit('error', err);
        });
    }
  };
  setTimeout(() => {
    _checkDone();
  });

  const parsedUrl = url.parse(u);
  const {protocol, host} = parsedUrl;
  const urlPrefix = protocol + '\/\/' + host + '/';
  g.fetch(u)
    .then(res => res.text())
    .then(s => {
      zip.file('index.html', s, {
        base64: false,
      });

      const _findAttr = (attrs = [], name = null) => attrs.find(a => a.name === name) || null;
      const _recurse = e => {
        if (e.tagName === 'script') {
          const srcAttr = _findAttr(e.attrs, 'src');
          if (srcAttr) {
            const {value} = srcAttr;
            const su = url.resolve(u, value);

            console.warn('got script', su);

            message = su;
            total++;
            _checkDone();

            g.fetch(su)
              .then(res => res.arrayBuffer())
              .then(d => {
                const cleanUrl = su.indexOf(urlPrefix) === 0 ? su.slice(urlPrefix.length) : su;
                zip.file(cleanUrl, d);
              })
              .catch(err => {
                console.warn(err.stack);
              })
              .finally(() => {
                current++;
                _checkDone();
              });
          }
        }
        if (e.childNodes) {
          for (let i = 0; i < e.childNodes.length; i++) {
            _recurse(e.childNodes[i]);
          }
        }
      };

      const o = parse5.parseFragment(s);
      _recurse(o);

      current++;
      if (current === total) {
        message = 'Finishing...';
      }
      _checkDone();
    })
    .catch(err => {
      loader.emit('error', err);
    });

  return loader;
};

module.exports = nsite;
