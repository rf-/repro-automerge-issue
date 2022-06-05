import { app, BrowserWindow } from 'electron';

// If you use this code to try to load the WASM module in the Node style:
//
//   import * as Automerge from 'automerge-js';
//   import * as automergeWasm from 'automerge-wasm';
//   Automerge.use(automergeWasm);
//   const actorId = Automerge.uuid();
//   Automerge.load(Automerge.save(Automerge.init(actorId)), actorId);
//
// You get this error:
//
//   TypeError: Cannot read properties of undefined (reading
//   '__wbindgen_add_to_stack_pointer')
//
// This seems to be because Webpack is using the `module` entry point, which
// doesn't support Node-style synchronous loading. If you try to work around
// that by using the async API:
//
//   import * as Automerge from 'automerge-js';
//   import automergeWasm from 'automerge-wasm';
//   automergeWasm().then((wasm: any) => {
//     Automerge.use(wasm);
//     const actorId = Automerge.uuid();
//     Automerge.load(Automerge.save(Automerge.init(actorId)), actorId);
//   });
//
// You get this error:
//
//   (node:30827) UnhandledPromiseRejectionWarning: ReferenceError: fetch is not defined
//       at init (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:2991:9)
//       at /Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:3052:97
//       at new Promise (<anonymous>)
//       at __WEBPACK_DEFAULT_EXPORT__ (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:3052:10)
//       at ./src/index.ts (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:4153:30)
//       at __webpack_require__ (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:4307:42)
//       at /Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:4363:37
//       at Object.<anonymous> (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:4366:12)
//       at Module._compile (node:internal/modules/cjs/loader:1118:14)
//       at Module._extensions..js (node:internal/modules/cjs/loader:1173:10)
//
// This is the same problem -- we're in code that wasm-bindgen assumes is being
// run in a browser, which is not true, so the async loading path isn't going
// to work.
//
// Alternately, we could try to work around it by explicitly loading the
// synchronous CommonJS/Node entry point:
//
//   import * as Automerge from 'automerge-js';
//   // @ts-ignore-error
//   import * as automergeWasm from 'automerge-wasm/nodejs';
//   Automerge.use(automergeWasm);
//   const actorId = Automerge.uuid();
//   Automerge.load(Automerge.save(Automerge.init(actorId)), actorId);
//
// In that case you get two mysterious errors. One of them is about a failure
// to load the `crypto` Node library:
//
//   panicked at 'could not retreive random bytes for uuid: Node.js crypto module is unavailable', /Users/orion/.cargo/registry/src/github.com-1ecc6299db9ec823/uuid-0.8.2/src/v4.rs:31:13
//
//   Stack:
//
//   Error
//       at module.exports.__wbg_new_693216e109162396 (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:2747:15)
//       at wasm://wasm/00346bd2:wasm-function[630]:0x9f09d
//       at wasm://wasm/00346bd2:wasm-function[1534]:0xc29ef
//       at wasm://wasm/00346bd2:wasm-function[935]:0xb59cf
//       at wasm://wasm/00346bd2:wasm-function[1083]:0xbc567
//       at wasm://wasm/00346bd2:wasm-function[1284]:0xc101e
//       at wasm://wasm/00346bd2:wasm-function[1295]:0xc12a1
//       at wasm://wasm/00346bd2:wasm-function[947]:0xb646d
//       at wasm://wasm/00346bd2:wasm-function[567]:0x987d8
//       at wasm://wasm/00346bd2:wasm-function[452]:0x8a372
//
// Looking into this error, a really weird thing seems to be happening. There's
// some bindgen-generated code that looks like this:
//
//   imports.wbg.__wbg_require_edfaedd93e302925 = function() {
//     return handleError(
//       function (arg0, arg1, arg2) {
//         var ret = getObject(arg0).require(getStringFromWasm0(arg1, arg2));
//         return addHeapObject(ret);
//       },
//       arguments
//     )
//   };
//
// I believe this is the implementation of `require` that's being exposed to
// the WASM code, and the error is (indirectly) being caused by a call to this
// function erroring. The weird thing is that if you debug that call,
// `getStringFromWasm0(arg1, arg2)` returns "crypto" as expected, but
// `getObject(arg0)` returns an object that doesn't actually have a `require`
// method? It's like the object representing the module or something? Maybe
// this is a difference in the module API provided by Webpack vs. Node?
//
// Anyway it's possible to hack around this by editing the implementation of
// `__wbg_require_edfaedd93e302925` to do a normal `require` call, but even if
// you do, you still get the second error, which is:
//
//   RuntimeError: unreachable
//       at wasm://wasm/00346bd2:wasm-function[935]:0xb5a09
//       at wasm://wasm/00346bd2:wasm-function[1083]:0xbc567
//       at wasm://wasm/00346bd2:wasm-function[1284]:0xc101e
//       at wasm://wasm/00346bd2:wasm-function[1295]:0xc12a1
//       at wasm://wasm/00346bd2:wasm-function[947]:0xb646d
//       at wasm://wasm/00346bd2:wasm-function[567]:0x987d8
//       at wasm://wasm/00346bd2:wasm-function[452]:0x8a372
//       at wasm://wasm/00346bd2:wasm-function[939]:0xb5d06
//       at module.exports.create (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:1651:14)
//       at Module.init (/Users/rfitz/src/repro-automerge-issue/.webpack/main/index.js:214:70)
//
// This is where I run out of ideas.

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
