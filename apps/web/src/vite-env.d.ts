/// <reference types="vite/client" />

declare global {
  interface Window {
    // Compatible with Electron DesktopApi; provided by installHttpApi().
    api: any;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
