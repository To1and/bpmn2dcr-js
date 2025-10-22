/// <reference types="vite/client" />

// Declare module for Python files with ?raw suffix
declare module '*.py?raw' {
  const content: string;
  export default content;
}
