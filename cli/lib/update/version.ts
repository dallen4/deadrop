import { gt } from 'semver';
import { GITHUB_RELEASES_URL, NPM_REGISTRY_LATEST_URL } from 'lib/constants';

// GitHub release tags are `deadrop@X.Y.Z` (see cli_publish_workflow.yml)
export const parseGithubReleaseTag = (tag: string): string =>
  tag.replace(/^deadrop@/, '');

// The releases list is shared with desktop's `deadrop-desktop@*` tags —
// /releases/latest can't distinguish between the two, so fetch the list
// and take the first entry whose tag is a CLI release, not just any tag
// starting with `deadrop` (which would also match `deadrop-desktop@`).
export const fetchLatestBinaryVersion = async (): Promise<string> => {
  const res = await fetch(GITHUB_RELEASES_URL);

  if (!res.ok)
    throw new Error(
      `Failed to fetch releases (${res.status} ${res.statusText})`,
    );

  const releases = (await res.json()) as Array<{ tag_name: string }>;
  const cliRelease = releases.find((r) => /^deadrop@/.test(r.tag_name));

  if (!cliRelease) throw new Error('No published deadrop CLI release found');

  return parseGithubReleaseTag(cliRelease.tag_name);
};

export const fetchLatestNpmVersion = async (): Promise<string> => {
  const res = await fetch(NPM_REGISTRY_LATEST_URL);

  if (!res.ok)
    throw new Error(
      `Failed to fetch latest npm version (${res.status} ${res.statusText})`,
    );

  const { version } = (await res.json()) as { version: string };

  return version;
};

export const isNewerVersion = (latest: string, current: string): boolean =>
  gt(latest, current);
