import '@testing-library/jest-dom/vitest';

if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock-preview';
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => {};
}
