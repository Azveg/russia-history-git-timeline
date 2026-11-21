import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} publicDir
 * @param {{ path?: string, enabled?: boolean }[]} mountedFiles
 */
export function discoverTimelineModules(publicDir, mountedFiles = []) {
  const flags = new Map((Array.isArray(mountedFiles) ? mountedFiles : [])
    .filter((entry) => typeof entry?.path === 'string')
    .map((entry) => [entry.path?.trim().replace(/^(?:\.\/|\/)+/, ''), entry.enabled !== false]));
  const modules = [];

  function walk(/** @type {string} */ directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const relFromPublic = path.relative(publicDir, fullPath).split(path.sep).join('/');
        if (relFromPublic === 'data/sync.manifest.json' || relFromPublic === 'data/modules.index.json') continue;

        const raw = fs.readFileSync(fullPath, 'utf8');
        let data = null;
        let parseError = '';
        try {
          data = JSON.parse(raw);
        } catch (error) {
          parseError = error instanceof Error ? error.message : String(error);
        }
        modules.push({
          relFromPublic, raw, data, parseError,
          enabled: flags.get(relFromPublic) !== false && data?.enabled !== false,
        });
      }
    }
  }

  const directory = path.join(publicDir, 'data');
  if (fs.existsSync(directory)) walk(directory);
  return modules.sort((a, b) => a.relFromPublic.localeCompare(b.relFromPublic));
}
