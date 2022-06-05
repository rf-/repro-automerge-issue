// If you try to use Automerge in this file:
//
//   import * as Automerge from 'automerge-js';
//   import automergeWasm from 'automerge-wasm';
//   automergeWasm().then((wasm: any) => {
//     Automerge.use(wasm);
//     const actorId = Automerge.uuid();
//     Automerge.load(Automerge.save(Automerge.init(actorId)), actorId);
//   });
//
// You get a 404, caused by the browser trying to load the `bindgen_bg.wasm`
// file from
// `http://localhost:3000/Users/rfitz/src/repro-automerge-issue/.webpack/renderer/main_window/native_modules/bindgen_bg.wasm`,
// which obviously isn't a real URL.
//
// This then causes a WebAssembly error since we're trying to parse a 404 page
// as a WASM module.
//
// If you disable out the `@vercel/webpack-asset-relocator-loader` rule in
// `webpack.rules.js`, it tries to load the file from
// `file:///Users/rfitz/src/repro-automerge-issue/.webpack/renderer/main_window/9dddfd88fc9c1de4849b.wasm`,
// which is at least an actual URL but fails because of CSP.
//
// In my actual repo, I somehow managed to hack everything up to the point of
// being able to load the WASM in this context, but then I just got the same
// `unreachable` error as in `index.ts`.
