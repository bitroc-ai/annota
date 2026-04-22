import { vi } from 'vitest';

const context2DStub = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: vi.fn(),
} as unknown as CanvasRenderingContext2D;

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(type: string) {
  if (type === '2d') return context2DStub;
  return null;
});
