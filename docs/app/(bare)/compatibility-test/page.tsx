"use client";

import { useEffect, useState, useRef } from "react";
import type OpenSeadragon from "openseadragon";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "pending" | "error";
  message: string;
  details?: Record<string, any>;
}

interface BrowserInfo {
  userAgent: string;
  platform: string;
  vendor: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  pixelDepth: number;
  webglVendor?: string;
  webglRenderer?: string;
  webglVersion?: string;
  webglShadingLanguageVersion?: string;
  webglMaxTextureSize?: number;
  webglMaxViewportDims?: number[];
  detectedOS?: string;
  detectedBrowser?: string;
  detectedVersion?: string;
}

export default function CompatibilityTestPage() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [imageUrl, setImageUrl] = useState("/playground/images/test/0.png");
  const [drawerMode, setDrawerMode] = useState<"canvas" | "webgl">("webgl");
  const [viewer, setViewer] = useState<OpenSeadragon.Viewer | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);

  // Collect browser and system information
  useEffect(() => {
    const info: BrowserInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      colorDepth: window.screen.colorDepth,
      pixelDepth: (window.screen as any).pixelDepth || window.screen.colorDepth,
    };

    // Detect OS
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac os x")) {
      const match = ua.match(/mac os x (\d+)[._](\d+)/);
      if (match) {
        info.detectedOS = `macOS ${match[1]}.${match[2]}`;
      } else {
        info.detectedOS = "macOS";
      }
    } else if (ua.includes("windows")) {
      info.detectedOS = "Windows";
    } else if (ua.includes("linux")) {
      info.detectedOS = "Linux";
    } else if (ua.includes("android")) {
      info.detectedOS = "Android";
    } else if (ua.includes("iphone") || ua.includes("ipad")) {
      info.detectedOS = "iOS";
    }

    // Detect browser
    if (
      ua.includes("safari") &&
      !ua.includes("chrome") &&
      !ua.includes("chromium")
    ) {
      const match = ua.match(/version\/(\d+\.\d+)/);
      info.detectedBrowser = "Safari";
      info.detectedVersion = match ? match[1] : "unknown";
    } else if (ua.includes("chrome") && !ua.includes("edg")) {
      const match = ua.match(/chrome\/(\d+\.\d+)/);
      info.detectedBrowser = "Chrome";
      info.detectedVersion = match ? match[1] : "unknown";
    } else if (ua.includes("firefox")) {
      const match = ua.match(/firefox\/(\d+\.\d+)/);
      info.detectedBrowser = "Firefox";
      info.detectedVersion = match ? match[1] : "unknown";
    } else if (ua.includes("edg")) {
      const match = ua.match(/edg\/(\d+\.\d+)/);
      info.detectedBrowser = "Edge";
      info.detectedVersion = match ? match[1] : "unknown";
    }

    // Get WebGL info
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl") ||
        canvas.getContext(
          "experimental-webgl"
        )) as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          info.webglVendor = gl.getParameter(
            debugInfo.UNMASKED_VENDOR_WEBGL
          ) as string;
          info.webglRenderer = gl.getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
          ) as string;
        }
        info.webglVersion = gl.getParameter(gl.VERSION) as string;
        info.webglShadingLanguageVersion = gl.getParameter(
          gl.SHADING_LANGUAGE_VERSION
        ) as string;
        info.webglMaxTextureSize = gl.getParameter(
          gl.MAX_TEXTURE_SIZE
        ) as number;
        const maxViewportDims = gl.getParameter(
          gl.MAX_VIEWPORT_DIMS
        ) as Int32Array;
        info.webglMaxViewportDims = [maxViewportDims[0], maxViewportDims[1]];
      }
    } catch (e) {
      console.error("Failed to get WebGL info:", e);
    }

    setBrowserInfo(info);
  }, []);

  // Test 1: Image element loading
  const testImageElement = async (): Promise<TestResult> => {
    return new Promise((resolve) => {
      const img = new Image();
      const startTime = performance.now();

      img.onload = () => {
        const loadTime = performance.now() - startTime;
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const complete = img.complete;
        const isVisible = width > 0 && height > 0;

        // Check if image is actually visible
        const testCanvas = document.createElement("canvas");
        testCanvas.width = width;
        testCanvas.height = height;
        const ctx = testCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(
            0,
            0,
            Math.min(10, width),
            Math.min(10, height)
          );
          const hasData = imageData.data.some((val) => val !== 0);
          const avgBrightness =
            imageData.data.reduce(
              (sum, val, idx) => (idx % 4 === 0 ? sum + val : sum),
              0
            ) /
            (imageData.data.length / 4);

          resolve({
            name: "Image Element Loading",
            status: isVisible && hasData ? "pass" : "fail",
            message: isVisible
              ? `Loaded successfully (${width}x${height}, ${loadTime.toFixed(
                  2
                )}ms)`
              : "Image loaded but dimensions are invalid",
            details: {
              width,
              height,
              complete,
              loadTime: `${loadTime.toFixed(2)}ms`,
              hasPixelData: hasData,
              avgBrightness: avgBrightness.toFixed(2),
            },
          });
        } else {
          resolve({
            name: "Image Element Loading",
            status: "error",
            message: "Failed to create test canvas context",
          });
        }
      };

      img.onerror = (error) => {
        resolve({
          name: "Image Element Loading",
          status: "error",
          message: `Failed to load image: ${error}`,
        });
      };

      img.crossOrigin = "anonymous";
      img.src = imageUrl;
    });
  };

  // Test 2: Canvas 2D rendering
  const testCanvas2D = async (): Promise<TestResult> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = canvas2dRef.current;
        if (!canvas) {
          resolve({
            name: "Canvas 2D Rendering",
            status: "error",
            message: "Canvas element not found",
          });
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({
            name: "Canvas 2D Rendering",
            status: "error",
            message: "Failed to get 2D context",
          });
          return;
        }

        try {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(
            0,
            0,
            Math.min(100, canvas.width),
            Math.min(100, canvas.height)
          );
          const hasData = imageData.data.some((val) => val !== 0);
          const nonZeroPixels = imageData.data.filter(
            (val, idx) => idx % 4 === 0 && val !== 0
          ).length;
          const totalPixels = imageData.data.length / 4;

          resolve({
            name: "Canvas 2D Rendering",
            status: hasData ? "pass" : "fail",
            message: hasData
              ? `Rendered successfully (${canvas.width}x${canvas.height})`
              : "Canvas rendered but no pixel data detected",
            details: {
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              hasPixelData: hasData,
              nonZeroPixels,
              totalPixels,
              pixelRatio:
                ((nonZeroPixels / totalPixels) * 100).toFixed(2) + "%",
            },
          });
        } catch (error) {
          resolve({
            name: "Canvas 2D Rendering",
            status: "error",
            message: `Error rendering to canvas: ${error}`,
          });
        }
      };

      img.onerror = () => {
        resolve({
          name: "Canvas 2D Rendering",
          status: "error",
          message: "Failed to load image for canvas test",
        });
      };

      img.src = imageUrl;
    });
  };

  // Test 3: WebGL texture loading
  const testWebGLTexture = async (): Promise<TestResult> => {
    return new Promise((resolve) => {
      const canvas = webglCanvasRef.current;
      if (!canvas) {
        resolve({
          name: "WebGL Texture Loading",
          status: "error",
          message: "WebGL canvas element not found",
        });
        return;
      }

      const gl = (canvas.getContext("webgl") ||
        canvas.getContext(
          "experimental-webgl"
        )) as WebGLRenderingContext | null;
      if (!gl) {
        resolve({
          name: "WebGL Texture Loading",
          status: "error",
          message: "WebGL not supported or context creation failed",
        });
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const texture = gl.createTexture();
          if (!texture) {
            resolve({
              name: "WebGL Texture Loading",
              status: "error",
              message: "Failed to create WebGL texture",
            });
            return;
          }

          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img
          );

          // Get image dimensions (texture dimensions match image dimensions)
          const width = img.naturalWidth;
          const height = img.naturalHeight;

          // Try to read pixels back
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Create a simple shader program to render the texture
          const vertexShader = gl.createShader(gl.VERTEX_SHADER);
          const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
          if (!vertexShader || !fragmentShader) {
            resolve({
              name: "WebGL Texture Loading",
              status: "error",
              message: "Failed to create shaders",
            });
            return;
          }

          gl.shaderSource(
            vertexShader,
            `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
              gl_Position = vec4(a_position, 0.0, 1.0);
              v_texCoord = a_texCoord;
            }
          `
          );
          gl.shaderSource(
            fragmentShader,
            `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoord;
            void main() {
              gl_FragColor = texture2D(u_texture, v_texCoord);
            }
          `
          );

          gl.compileShader(vertexShader);
          gl.compileShader(fragmentShader);

          if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            resolve({
              name: "WebGL Texture Loading",
              status: "error",
              message: `Vertex shader compile error: ${gl.getShaderInfoLog(
                vertexShader
              )}`,
            });
            return;
          }

          if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            resolve({
              name: "WebGL Texture Loading",
              status: "error",
              message: `Fragment shader compile error: ${gl.getShaderInfoLog(
                fragmentShader
              )}`,
            });
            return;
          }

          const program = gl.createProgram();
          if (!program) {
            resolve({
              name: "WebGL Texture Loading",
              status: "error",
              message: "Failed to create shader program",
            });
            return;
          }

          gl.attachShader(program, vertexShader);
          gl.attachShader(program, fragmentShader);
          gl.linkProgram(program);

          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            resolve({
              name: "WebGL Texture Loading",
              status: "error",
              message: `Program link error: ${gl.getProgramInfoLog(program)}`,
            });
            return;
          }

          // Render texture to canvas
          gl.useProgram(program);
          const positionLocation = gl.getAttribLocation(program, "a_position");
          const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
          const textureLocation = gl.getUniformLocation(program, "u_texture");

          const positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
          );

          const texCoordBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
            gl.STATIC_DRAW
          );

          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);

          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.enableVertexAttribArray(positionLocation);
          gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
          gl.enableVertexAttribArray(texCoordLocation);
          gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(textureLocation, 0);

          gl.drawArrays(gl.TRIANGLES, 0, 6);

          // Read pixels back
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(
            0,
            0,
            canvas.width,
            canvas.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels
          );
          const hasData = pixels.some((val) => val !== 0);
          const nonZeroPixels = pixels.filter(
            (val, idx) => idx % 4 === 0 && val !== 0
          ).length;
          const totalPixels = pixels.length / 4;

          resolve({
            name: "WebGL Texture Loading",
            status: hasData ? "pass" : "fail",
            message: hasData
              ? `WebGL texture loaded and rendered (${width}x${height})`
              : "WebGL texture loaded but no pixel data detected",
            details: {
              textureWidth: width,
              textureHeight: height,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              hasPixelData: hasData,
              nonZeroPixels,
              totalPixels,
              pixelRatio:
                ((nonZeroPixels / totalPixels) * 100).toFixed(2) + "%",
            },
          });
        } catch (error) {
          resolve({
            name: "WebGL Texture Loading",
            status: "error",
            message: `WebGL error: ${error}`,
          });
        }
      };

      img.onerror = () => {
        resolve({
          name: "WebGL Texture Loading",
          status: "error",
          message: "Failed to load image for WebGL test",
        });
      };

      img.src = imageUrl;
    });
  };

  // Test 4: OpenSeadragon with different drawer modes
  const testOpenSeadragon = async (
    drawer: "canvas" | "webgl"
  ): Promise<TestResult> => {
    return new Promise((resolve) => {
      if (!viewer) {
        resolve({
          name: `OpenSeadragon (${drawer.toUpperCase()})`,
          status: "error",
          message:
            "Viewer not initialized - OpenSeadragon may still be loading",
        });
        return;
      }

      // Check if viewer is still valid (not destroyed)
      if (!viewer.element || !viewerRef.current) {
        resolve({
          name: `OpenSeadragon (${drawer.toUpperCase()})`,
          status: "error",
          message: "Viewer element not available",
        });
        return;
      }

      // Check if drawer mode matches (viewer might have been recreated with different drawer)
      if (drawer !== drawerMode) {
        resolve({
          name: `OpenSeadragon (${drawer.toUpperCase()})`,
          status: "error",
          message: `Viewer drawer mode (${drawerMode}) doesn't match test drawer (${drawer})`,
        });
        return;
      }

      const startTime = performance.now();
      let imageLoaded = false;
      let errorOccurred = false;
      let resolved = false;

      // Helper to safely resolve only once
      const safeResolve = (result: TestResult) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      const openHandler = () => {
        imageLoaded = true;
        const loadTime = performance.now() - startTime;

        // Check if image is visible in OpenSeadragon
        setTimeout(() => {
          const osdCanvas = viewer.element?.querySelector(
            ".openseadragon-canvas"
          );
          if (osdCanvas) {
            const imageCanvas = osdCanvas.querySelector(
              "canvas:not(.annota-pixi-canvas)"
            ) as HTMLCanvasElement;
            if (imageCanvas) {
              const canvasWidth = imageCanvas.width;
              const canvasHeight = imageCanvas.height;
              const hasValidDimensions = canvasWidth > 0 && canvasHeight > 0;

              // Try to read pixels - works for 2D canvas, not for WebGL
              let hasData = false;
              let nonZeroPixels = 0;
              let totalPixels = 0;

              if (drawer === "canvas") {
                const ctx = imageCanvas.getContext("2d");
                if (ctx) {
                  try {
                    const imageData = ctx.getImageData(
                      0,
                      0,
                      Math.min(100, canvasWidth),
                      Math.min(100, canvasHeight)
                    );
                    hasData = imageData.data.some((val) => val !== 0);
                    nonZeroPixels = imageData.data.filter(
                      (val, idx) => idx % 4 === 0 && val !== 0
                    ).length;
                    totalPixels = imageData.data.length / 4;
                  } catch (e) {
                    // CORS or other error reading pixels
                    hasData = hasValidDimensions; // Assume valid if dimensions are correct
                  }
                }
              } else {
                // For WebGL, we can't easily read pixels due to CORS/security
                // Just check if canvas has valid dimensions
                hasData = hasValidDimensions;
                totalPixels = canvasWidth * canvasHeight;
              }

              // Clean up handlers before resolving
              viewer.removeHandler("open", openHandler);
              viewer.removeHandler("tile-load-failed", errorHandler);

              safeResolve({
                name: `OpenSeadragon (${drawer.toUpperCase()})`,
                status: hasValidDimensions ? "pass" : "fail",
                message: hasValidDimensions
                  ? `Image loaded in OpenSeadragon (${loadTime.toFixed(
                      2
                    )}ms, ${canvasWidth}x${canvasHeight})`
                  : "OpenSeadragon loaded but canvas has invalid dimensions",
                details: {
                  loadTime: `${loadTime.toFixed(2)}ms`,
                  canvasWidth,
                  canvasHeight,
                  hasPixelData: hasData,
                  nonZeroPixels,
                  totalPixels,
                  pixelRatio:
                    totalPixels > 0
                      ? ((nonZeroPixels / totalPixels) * 100).toFixed(2) + "%"
                      : "N/A",
                  drawer: drawer,
                  note:
                    drawer === "webgl"
                      ? "WebGL canvas - pixel data reading limited by CORS"
                      : undefined,
                },
              });
            } else {
              viewer.removeHandler("open", openHandler);
              viewer.removeHandler("tile-load-failed", errorHandler);
              safeResolve({
                name: `OpenSeadragon (${drawer.toUpperCase()})`,
                status: "error",
                message: "OpenSeadragon canvas not found",
                details: {
                  loadTime: `${loadTime.toFixed(2)}ms`,
                  drawer: drawer,
                },
              });
            }
          } else {
            viewer.removeHandler("open", openHandler);
            viewer.removeHandler("tile-load-failed", errorHandler);
            safeResolve({
              name: `OpenSeadragon (${drawer.toUpperCase()})`,
              status: "error",
              message: "OpenSeadragon canvas container not found",
              details: {
                loadTime: `${loadTime.toFixed(2)}ms`,
                drawer: drawer,
              },
            });
          }
        }, 500);
      };

      const errorHandler = (event: any) => {
        errorOccurred = true;
        viewer.removeHandler("open", openHandler);
        viewer.removeHandler("tile-load-failed", errorHandler);
        safeResolve({
          name: `OpenSeadragon (${drawer.toUpperCase()})`,
          status: "error",
          message: `OpenSeadragon error: ${event.message || "Unknown error"}`,
          details: {
            drawer: drawer,
          },
        });
      };

      try {
        viewer.addHandler("open", openHandler);
        viewer.addHandler("tile-load-failed", errorHandler);

        viewer.open({
          type: "image",
          url: imageUrl,
        });
      } catch (error) {
        viewer.removeHandler("open", openHandler);
        viewer.removeHandler("tile-load-failed", errorHandler);
        safeResolve({
          name: `OpenSeadragon (${drawer.toUpperCase()})`,
          status: "error",
          message: `Failed to open image: ${
            error instanceof Error ? error.message : String(error)
          }`,
          details: {
            drawer: drawer,
          },
        });
        return;
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!imageLoaded && !errorOccurred && !resolved) {
          viewer.removeHandler("open", openHandler);
          viewer.removeHandler("tile-load-failed", errorHandler);
          safeResolve({
            name: `OpenSeadragon (${drawer.toUpperCase()})`,
            status: "error",
            message: "Timeout waiting for image to load",
            details: {
              drawer: drawer,
            },
          });
        }
      }, 10000);
    });
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults([
      {
        name: "Image Element Loading",
        status: "pending",
        message: "Running...",
      },
      { name: "Canvas 2D Rendering", status: "pending", message: "Running..." },
      {
        name: "WebGL Texture Loading",
        status: "pending",
        message: "Running...",
      },
      {
        name: `OpenSeadragon (${drawerMode.toUpperCase()})`,
        status: "pending",
        message: "Running...",
      },
    ]);

    const results = await Promise.all([
      testImageElement(),
      testCanvas2D(),
      testWebGLTexture(),
      testOpenSeadragon(drawerMode),
    ]);

    setTestResults(results);
  };

  // Detect if WebGL is likely to fail (macOS 13 Safari issue)
  const shouldUseCanvasFallback = () => {
    if (drawerMode !== "webgl") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isMacOS13 =
      ua.includes("mac os x") &&
      (ua.includes("version/16") || ua.includes("version/17"));
    const isSafari = ua.includes("safari") && !ua.includes("chrome");
    return isMacOS13 && isSafari;
  };

  // Dynamically load and initialize OpenSeadragon viewer
  useEffect(() => {
    if (!viewerRef.current) return;

    let currentViewer: OpenSeadragon.Viewer | null = null;
    let isMounted = true;
    let webglCheckTimeout: NodeJS.Timeout | null = null;

    const initViewer = async () => {
      try {
        // Dynamically import OpenSeadragon
        const OSDModule = await import("openseadragon");
        // Handle different module export formats - OpenSeadragon can be exported as default or namespace
        const OSD =
          (OSDModule as any).default?.default ||
          (OSDModule as any).default ||
          OSDModule;

        if (!isMounted || !viewerRef.current) return;

        // Use canvas mode if WebGL is known to fail on this browser
        const effectiveDrawer = shouldUseCanvasFallback()
          ? "canvas"
          : drawerMode;

        // OpenSeadragon is a function that creates a viewer
        currentViewer = OSD({
          element: viewerRef.current,
          tileSources: {
            type: "image",
            url: imageUrl,
          },
          ...(effectiveDrawer === "canvas"
            ? { drawer: "canvas" }
            : { drawer: "webgl" }),
          showNavigationControl: false,
          visibilityRatio: 1,
        } as OpenSeadragon.Options & { drawer?: string });

        // If using WebGL, check if it's actually rendering after a delay
        if (effectiveDrawer === "webgl" && drawerMode === "webgl") {
          const checkWebGLRendering = () => {
            if (!currentViewer || !isMounted) return;

            const osdCanvas = currentViewer.element?.querySelector(
              ".openseadragon-canvas"
            );
            if (!osdCanvas) return;

            const imageCanvas = osdCanvas.querySelector(
              "canvas:not(.annota-pixi-canvas)"
            ) as HTMLCanvasElement;

            if (imageCanvas && currentViewer) {
              // Try to detect if WebGL is actually rendering by checking canvas state
              // On macOS 13 Safari, WebGL canvas may have dimensions but be blank
              const gl = (imageCanvas.getContext("webgl") ||
                imageCanvas.getContext(
                  "experimental-webgl"
                )) as WebGLRenderingContext | null;

              if (gl) {
                // Check if there's any texture bound or if rendering happened
                try {
                  const params = gl.getParameter(gl.TEXTURE_BINDING_2D);
                  // If no texture is bound and canvas appears blank, WebGL likely failed
                  // Auto-switch to canvas mode
                  if (
                    !params &&
                    imageCanvas.width > 0 &&
                    imageCanvas.height > 0
                  ) {
                    console.warn(
                      "WebGL appears to not be rendering on macOS 13 Safari. Consider using canvas mode."
                    );
                    // Don't auto-switch here - let user manually switch via the dropdown
                  }
                } catch (e) {
                  // WebGL context might not support this check
                  console.warn("Could not check WebGL texture binding:", e);
                }
              }
            }
          };

          // Check after image loads
          if (currentViewer) {
            currentViewer.addHandler("open", () => {
              webglCheckTimeout = setTimeout(checkWebGLRendering, 500);
            });
          }
        }

        if (isMounted) {
          setViewer(currentViewer);
          // If we auto-switched to canvas, update the drawer mode state
          if (effectiveDrawer !== drawerMode) {
            setDrawerMode("canvas");
          }
        }
      } catch (error) {
        console.error(
          "Failed to load or initialize OpenSeadragon viewer:",
          error
        );
      }
    };

    initViewer();

    return () => {
      isMounted = false;
      if (webglCheckTimeout) {
        clearTimeout(webglCheckTimeout);
      }
      if (currentViewer) {
        try {
          // Remove all handlers before destroying to prevent errors
          if (typeof (currentViewer as any).removeAllHandlers === "function") {
            (currentViewer as any).removeAllHandlers();
          }
          currentViewer.destroy();
        } catch (e) {
          // Silently handle destruction errors - viewer might already be destroyed
        }
      }
    };
  }, [drawerMode, imageUrl]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-4">PNG Compatibility Test</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This page tests PNG image loading and rendering across different
            methods to diagnose WebKit/Safari compatibility issues on macOS 13.
          </p>

          {/* WebGL Warning for macOS 13 Safari */}
          {browserInfo && shouldUseCanvasFallback() && (
            <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                ⚠️ WebGL Compatibility Issue Detected
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                macOS 13 Safari has a known issue where PNG images don't display
                correctly in WebGL mode. The viewer will automatically use
                Canvas mode for better compatibility. If the image still doesn't
                appear, try manually switching to Canvas mode using the dropdown
                below.
              </p>
            </div>
          )}

          {/* Browser Info */}
          {browserInfo && (
            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <h2 className="text-xl font-semibold mb-3">
                Browser & System Information
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>OS:</strong>{" "}
                  {browserInfo.detectedOS || browserInfo.platform}
                </div>
                <div>
                  <strong>Browser:</strong>{" "}
                  {browserInfo.detectedBrowser || "Unknown"}{" "}
                  {browserInfo.detectedVersion}
                </div>
                <div>
                  <strong>User Agent:</strong> {browserInfo.userAgent}
                </div>
                <div>
                  <strong>Platform:</strong> {browserInfo.platform}
                </div>
                <div>
                  <strong>Device Pixel Ratio:</strong>{" "}
                  {browserInfo.devicePixelRatio}
                </div>
                <div>
                  <strong>Screen:</strong> {browserInfo.screenWidth}x
                  {browserInfo.screenHeight} @ {browserInfo.colorDepth}bit
                </div>
                <div>
                  <strong>Window:</strong> {browserInfo.windowWidth}x
                  {browserInfo.windowHeight}
                </div>
                <div>
                  <strong>Hardware Concurrency:</strong>{" "}
                  {browserInfo.hardwareConcurrency}
                </div>
                {browserInfo.webglVendor && (
                  <>
                    <div>
                      <strong>WebGL Vendor:</strong> {browserInfo.webglVendor}
                    </div>
                    <div>
                      <strong>WebGL Renderer:</strong>{" "}
                      {browserInfo.webglRenderer}
                    </div>
                    <div>
                      <strong>WebGL Version:</strong> {browserInfo.webglVersion}
                    </div>
                    <div>
                      <strong>Max Texture Size:</strong>{" "}
                      {browserInfo.webglMaxTextureSize}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4 items-center">
              <label className="font-semibold">Image URL:</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div className="flex gap-4 items-center">
              <label className="font-semibold">OpenSeadragon Drawer:</label>
              <select
                value={drawerMode}
                onChange={(e) =>
                  setDrawerMode(e.target.value as "canvas" | "webgl")
                }
                className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="webgl">WebGL</option>
                <option value="canvas">Canvas</option>
              </select>
            </div>
            <button
              onClick={runAllTests}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Run All Tests
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            {testResults.map((result, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${
                  result.status === "pass"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-500"
                    : result.status === "fail"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-500"
                    : result.status === "error"
                    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{result.name}</h3>
                  <span
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      result.status === "pass"
                        ? "bg-green-500 text-white"
                        : result.status === "fail"
                        ? "bg-red-500 text-white"
                        : result.status === "error"
                        ? "bg-orange-500 text-white"
                        : "bg-slate-400 text-white"
                    }`}
                  >
                    {result.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm mb-2">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold">
                      Details
                    </summary>
                    <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Visual Tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Element Test */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Image Element</h2>
            <img
              ref={imgElementRef}
              src={imageUrl}
              alt="Test image"
              className="max-w-full h-auto border rounded"
              crossOrigin="anonymous"
              onLoad={() => console.log("Image element loaded")}
              onError={(e) => console.error("Image element error:", e)}
            />
          </div>

          {/* Canvas 2D Test */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Canvas 2D</h2>
            <canvas
              ref={canvas2dRef}
              className="max-w-full h-auto border rounded bg-slate-100 dark:bg-slate-800"
            />
          </div>

          {/* WebGL Test */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">WebGL Texture</h2>
            <canvas
              ref={webglCanvasRef}
              className="max-w-full h-auto border rounded bg-slate-100 dark:bg-slate-800"
            />
          </div>

          {/* OpenSeadragon Test */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              OpenSeadragon ({drawerMode.toUpperCase()})
            </h2>
            <div
              ref={viewerRef}
              className="w-full h-64 border rounded bg-slate-100 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Debug Output */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <details>
            <summary className="cursor-pointer font-semibold mb-2">
              Full Browser Info (JSON)
            </summary>
            <pre className="p-4 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(browserInfo, null, 2)}
            </pre>
          </details>
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold mb-2">
              Test Results (JSON)
            </summary>
            <pre className="p-4 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
