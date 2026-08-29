/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the Laravel API, no trailing slash. Never empty: the app and
   *  the API are always on different hosts. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
