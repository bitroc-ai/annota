// CommonJS mock for OpenSeadragon (for Node.js require)
// This prevents "document is not defined" errors during preview server startup

module.exports = {
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
