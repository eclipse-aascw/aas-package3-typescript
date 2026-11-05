// SPDX-FileCopyrightText: 2026 aas-package3-typescript AUTHORS
//
// SPDX-License-Identifier: MIT

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022'
});
