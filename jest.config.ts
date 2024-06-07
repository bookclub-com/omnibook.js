export default {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ['/node_modules/'],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['node_modules'],
};