// Mock OpenSeadragon for SSR/build/preview environments
// This prevents "document is not defined" errors

export default {
  Viewer: class {
    constructor() {}
  },
  Point: class {
    x: number;
    y: number;
    constructor(x?: number, y?: number) {
      this.x = x || 0;
      this.y = y || 0;
    }
  },
};
