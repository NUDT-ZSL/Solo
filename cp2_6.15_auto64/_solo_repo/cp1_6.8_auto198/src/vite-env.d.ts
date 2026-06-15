/// <reference types="vite/client" />

declare module '*.shader?raw' {
  const content: string;
  export default content;
}
