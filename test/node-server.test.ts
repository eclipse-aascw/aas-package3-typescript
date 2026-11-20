// SPDX-FileCopyrightText: 2026 aas-package3-typescript AUTHORS
//
// SPDX-License-Identifier: MIT

import { describe, expect, test } from 'vitest';
import { mkdtemp, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NewPackaging, WithPackage } from '../src';

describe('Node server environment', () => {
  test('creates, flushes, reopens and mutates package on filesystem path APIs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aasx-node-'));
    const filePath = join(dir, 'sample.aasx');

    try {
      const packaging = NewPackaging();
      const writePkg = await packaging.Create(filePath);

      const spec = await writePkg.PutPart(
        new URL('https://package.local/aasx/spec.aas.xml'),
        'application/xml',
        new TextEncoder().encode('<aas/>')
      );
      await writePkg.MakeSpec(spec);
      await writePkg.Flush();
      await writePkg.Close();

      const readPkg = await packaging.OpenRead(filePath);
      const specs = await readPkg.Specs();
      expect(specs).toHaveLength(1);
      expect(specs[0].URI.pathname).toBe('/aasx/spec.aas.xml');
      await readPkg.Close();

      const rwPkg = await packaging.OpenReadWrite(filePath);
      const thumb = await rwPkg.PutPart(
        new URL('https://package.local/thumbnail.png'),
        'image/png',
        new Uint8Array([1, 2, 3, 4])
      );
      await rwPkg.SetThumbnail(thumb);
      await rwPkg.Flush();
      await rwPkg.Close();

      const reopened = await packaging.OpenRead(filePath);
      const thumbnail = await reopened.Thumbnail();
      expect(thumbnail?.URI.pathname).toBe('/thumbnail.png');
      await reopened.Close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('synchronous Close flushes to a file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aasx-node-'));
    const filePath = join(dir, 'sample.aasx');

    try {
      const packaging = NewPackaging();
      const pkg = await packaging.OpenReadWrite(await createdFile(filePath));
      const spec = await pkg.PutPart(
        new URL('https://package.local/aasx/spec.aas.xml'),
        'application/xml',
        new TextEncoder().encode('<aas/>')
      );
      await pkg.MakeSpec(spec);
      pkg.Close();

      const reopened = await packaging.OpenRead(filePath);
      expect(await reopened.Specs()).toHaveLength(1);
      reopened.Close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('closing an unmodified read-write package leaves the file untouched', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aasx-node-'));
    const filePath = join(dir, 'sample.aasx');

    try {
      const packaging = NewPackaging();
      await WithPackage(packaging.Create(filePath), () => undefined);

      const past = new Date('2020-01-01T00:00:00Z');
      await utimes(filePath, past, past);

      await WithPackage(packaging.OpenReadWrite(filePath), (pkg) => pkg.Parts());
      expect((await stat(filePath)).mtime.getTime()).toBe(past.getTime());

      await WithPackage(packaging.OpenReadWrite(filePath), (pkg) =>
        pkg.PutPart(new URL('https://package.local/thumbnail.png'), 'image/png', new Uint8Array([1]))
      );
      expect((await stat(filePath)).mtime.getTime()).not.toBe(past.getTime());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

async function createdFile(filePath: string): Promise<string> {
  const pkg = await NewPackaging().Create(filePath);
  pkg.Close();
  return filePath;
}
