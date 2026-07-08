import { gt } from 'semver';
import {
  GITHUB_LATEST_RELEASE_URL,
  NPM_REGISTRY_LATEST_URL,
} from 'lib/constants';

// GitHub release tags are `deadrop@X.Y.Z` (see cli_publish_workflow.yml)
export const parseGithubReleaseTag = (tag: string): string =>
  tag.replace(/^deadrop@/, '');

export const fetchLatestBinaryVersion = async (): Promise<string> => {
  const res = await fetch(GITHUB_LATEST_RELEASE_URL);

  if (!res.ok)
    throw new Error(
      `Failed to fetch latest release (${res.status} ${res.statusText})`,
    );

  const { tag_name: tag } = (await res.json()) as { tag_name: string };

  return parseGithubReleaseTag(tag);
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
