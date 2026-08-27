import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
// @ts-expect-error — plain CJS publish helper, no type declarations
import { stripWorkspaceDeps } from '../../../scripts/strip-workspace-deps';

describe('stripWorkspaceDeps', () => {
  it('removes workspace-protocol deps and keeps registry ones', () => {
    const { pkg, removed } = stripWorkspaceDeps({
      dependencies: { shared: 'workspace:*', chalk: '^5.2.0' },
    });

    expect(pkg.dependencies).toEqual({ chalk: '^5.2.0' });
    expect(removed).toEqual(['dependencies.shared']);
  });

  it('drops a dependency field left empty rather than publishing {}', () => {
    const { pkg } = stripWorkspaceDeps({
      dependencies: { shared: 'workspace:*' },
    });

    expect(pkg).not.toHaveProperty('dependencies');
  });

  it('does not mutate the input manifest', () => {
    const input = { dependencies: { shared: 'workspace:*' } };
    stripWorkspaceDeps(input);

    expect(input.dependencies.shared).toBe('workspace:*');
  });

  // The regression this exists for: a `workspace:` range reaching the published
  // manifest resolves against the public registry and breaks `npm i deadrop`.
  it('leaves no workspace ranges in the real cli manifest', () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(__dirname, '../../package.json'),
        'utf8',
      ),
    );

    const { pkg } = stripWorkspaceDeps(manifest);

    expect(JSON.stringify(pkg)).not.toContain('workspace:');
  });
});
