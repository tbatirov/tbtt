/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    // Only run tests in the test directory
    include: ['src/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Exclude node_modules and dist
    exclude: ['node_modules/**', 'dist/**'],
    
    // Environment configuration
    environment: 'node',
    
    // Optimize for speed
    threads: true,
    isolate: true,
    
    // Don't watch files by default
    watch: false,
    
    // Timeout for tests
    testTimeout: 10000,
    
    // Silent by default, only show test results
    silent: true,
    
    // Don't show browser
    browser: {
      enabled: false,
      name: 'chrome',
      headless: true
    }
  }
});
