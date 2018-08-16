const events = require('events');
const {EventEmitter} = events;
const url = require('url');
const parse5 = require('parse5');
const jszip = require('jszip/dist/jszip.js');
// const randomstring = require('randomstring');

const packages = {};

const g = typeof global !== 'undefined' ? global : window;
if (typeof g.fetch === 'undefined') {
  g.fetch = u => new Promise((accept, reject) => {
    const {protocol} = url.parse(u);
    const proxyReq = (protocol === 'https:' ? https : http).get(u, proxyRes => {
      const bs = [];
      proxyRes.on('data', d => {
        bs.push(d);
      });
      proxyRes.on('end', () => {
        accept(Buffer.concat(bs));
      });
    });
    proxyReq.on('error', err => {
      reject(err);
    });
    proxyReq.end();
  });
}
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
        .then(d => {
          packages[id] = d;
          setTimeout(() => {
            packages[id] = null;
          }, 60 * 1000);

          loader.emit('end', {
            url: `https://exoc.webmr.io/package?id=${id}`,
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
  fetch(u)
    .then(d => d.toString('utf8'))
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

            fetch(su)
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
