import fs from 'node:fs';

const LOCKFILE = 'package-lock.json';
const REGISTRY = 'https://registry.npmjs.org';
const lock = JSON.parse(fs.readFileSync(LOCKFILE, 'utf8'));
const missing = Object.entries(lock.packages).filter(([location, entry]) =>
  location && !entry.inBundle && !entry.link && (!entry.integrity || !entry.resolved),
);

if (process.argv.includes('--check')) {
  if (missing.length > 0) {
    console.error(`Missing registry metadata for ${missing.length} lockfile entries.`);
    process.exitCode = 1;
  } else {
    console.log('Each separately installed package has a pinned tarball and integrity.');
  }
} else {
  for (let start = 0; start < missing.length; start += 8) {
    await Promise.all(missing.slice(start, start + 8).map(async ([location, entry]) => {
      const name = entry.name ?? location.split('node_modules/').at(-1);
      const endpoint = `${REGISTRY}/${encodeURIComponent(name)}/${encodeURIComponent(entry.version)}`;
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`${name}@${entry.version}: npm registry HTTP ${response.status}`);
      const { version, dist } = await response.json();
      if (version !== entry.version || !dist?.tarball ||
          new URL(dist.tarball).origin !== REGISTRY ||
          !/^sha512-[A-Za-z0-9+/]{86}==$/.test(dist.integrity ?? '') ||
          (entry.integrity && entry.integrity !== dist.integrity) ||
          (entry.resolved && entry.resolved !== dist.tarball)) {
        throw new Error(`${name}@${entry.version}: inconsistent registry metadata`);
      }
      entry.resolved = dist.tarball;
      entry.integrity = dist.integrity;
    }));
  }

  if (missing.length > 0) {
    // Replace the file only after every registry response has been checked.
    const tempPath = `${LOCKFILE}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(lock, null, 2) + '\n', { flag: 'wx' });
    fs.renameSync(tempPath, LOCKFILE);
  }
  console.log(`Pinned registry metadata for ${missing.length} lockfile entries.`);
}
