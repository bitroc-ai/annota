// CommonJS module to mock openseadragon at Node.js module level
// This intercepts require('openseadragon') calls before the real module loads
// This file is loaded via NODE_OPTIONS --require flag

const Module = require('module');
const originalRequire = Module.prototype.require;

// Create the mock object
const openseadragonMock = {
  Viewer: class {
    constructor() {}
    addHandler() {}
    removeHandler() {}
    open() {}
    close() {}
  },
  Point: class {
    constructor(x, y) {
      this.x = x ?? 0;
      this.y = y ?? 0;
    }
  },
};

// For ESM compatibility, some code might access .default
openseadragonMock.default = openseadragonMock;

// Override Module.prototype.require to intercept openseadragon
Module.prototype.require = function(id) {
  if (id === 'openseadragon') {
    return openseadragonMock;
  }
  return originalRequire.apply(this, arguments);
};
