import '@testing-library/jest-dom';

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => '00000000-0000-4000-8000-000000000000'
  },
  writable: true
});
