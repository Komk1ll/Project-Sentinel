/// <reference types="vite/client" />

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): {
    readonly buffer: ArrayBuffer;
    readonly byteOffset: number;
    readonly byteLength: number;
  };
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
}
