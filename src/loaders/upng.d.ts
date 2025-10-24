/**
 * Type declarations for upng-js
 */
declare module 'upng-js' {
  interface DecodedImage {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: any[];
    tabs: Record<string, any>;
    data: ArrayBuffer;
  }

  interface UPNG {
    decode(buffer: ArrayBuffer): DecodedImage;
    toRGBA8(img: DecodedImage): ArrayBuffer[];
    encode(
      imgs: ArrayBuffer[],
      width: number,
      height: number,
      cnum: number,
      dels?: number[]
    ): ArrayBuffer;
  }

  const upng: UPNG;
  export default upng;
}
