# Read / Write

Use `OpenReadWrite` or `Create` to mutate package parts.

The changes are kept in memory until they are flushed:

* `Flush()` writes the pending changes. Use it to save in the middle of a session.
  `FlushSync()` does the same synchronously.
* `Close()` flushes the package if it has been modified since it was opened or
  last flushed, and then closes it. A package opened read-write and closed
  without changes is left untouched.
* `Close()` is synchronous. If you opened the package on a stream whose
  `writeAll` returns a Promise, it can't wait for the write, so it throws and
  leaves the package open. Use `CloseAsync()` for such streams.
* `Discard()` closes the package without writing the pending changes.

`WithPackage` combines these like a `with` block: it closes (and thus flushes)
the package when the callback completes, but discards the changes when the
callback throws, so a half-done modification never reaches the disk.

```ts
import { NewPackaging, WithPackage } from 'aas-package3-typescript';

const packaging = NewPackaging();

await WithPackage(packaging.OpenReadWrite('/path/to/some/file.aasx'), async (pkg) => {
    const part = await pkg.PutPart(
        new URL('https://package.local/aasx/data.json'),
        'application/json',
        new TextEncoder().encode('{}')
    );
    await pkg.MakeSpec(part);
});
```
