import { defineConfig } from 'vitest/config';
import reactNative from 'vitest-react-native';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    include: ['__tests__/**/*'],
    setupFiles: ['__helpers__/setup.ts'],
    coverage: {
      include: ['src/**/*'],
      exclude: ['src/interfaces/**', 'src/cli.ts'],
      reporter: ['text', 'text-summary', 'lcov', 'html'],
    },
    alias: {
      'react-native-navigation': '/__mocks__/react-native-navigation',
    }
  },
  plugins: [reactNative(), tsconfigPaths()],
});
