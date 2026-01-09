// Setup script to mock openseadragon at Node.js module level
// This runs before any other code via --require flag

if (typeof window === 'undefined') {
  // We're in Node.js, mock openseadragon
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    if (id === 'openseadragon') {
      return {
        Viewer: class {
          constructor() {}
        },
        Point: class {
          constructor(x, y) {
            this.x = x || 0;
            this.y = y || 0;
          }
        },
      };
    }
    return originalRequire.apply(this, arguments);
  };
}
