import './index.css';

// If you try to use Automerge in this file out of the box:
//
//   import * as Automerge from 'automerge-js';
//   import automergeWasm from 'automerge-wasm';
//   automergeWasm().then((wasm: any) => {
//     Automerge.use(wasm);
//     const actorId = Automerge.uuid();
//     Automerge.load(Automerge.save(Automerge.init(actorId)), actorId);
//   });
//
// You get the same failure mode as described in `preload.ts`.
//
// However, if you disable the `@vercel/webpack-asset-relocator-loader` rule in
// `webpack.rules.js`, it actually works!
