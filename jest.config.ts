export default {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    'tests/**/*.ts',
    '!**/node_modules/**',
  ],
  coverageProvider: "babel",
  coverageReporters: ['html', 'text', 'text-summary', 'cobertura'],
  coveragePathIgnorePatterns: [
    'node_modules',
    '__tests__',
    '<rootDir>/src/index.js',
    '<rootDir>/src/config',
    '<rootDir>/src/helpers/validations.js',
    '<rootDir>/src/plugins/joi.js',
    '<rootDir>/src/plugins/logging.js',
    '<rootDir>/src/helpers/validations.js',
    '<rootDir>/src/server/components/server.js',
    '<rootDir>/tests',
  ],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/env/env.ts',
    '<rootDir>/tests/setup.ts',
  ],
  preset: 'ts-jest'
};
