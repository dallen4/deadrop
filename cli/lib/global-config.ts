import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { APP_IDENTIFIER, CONFIG_FILE_NAME } from '@shared/lib/constants';

// Matches Tauri's app_data_dir() resolution for the desktop app's
// identifier, so CLI and desktop fall back to the same shared, global
// vault config when no project-scoped .deadroprc is found.
export const globalConfigDir = (): string => {
  const home = homedir();

  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', APP_IDENTIFIER);
    case 'win32':
      return join(
        process.env.APPDATA ?? join(home, 'AppData', 'Roaming'),
        APP_IDENTIFIER,
      );
    default:
      return join(
        process.env.XDG_DATA_HOME ?? join(home, '.local', 'share'),
        APP_IDENTIFIER,
      );
  }
};

export const globalConfigPath = (): string =>
  join(globalConfigDir(), CONFIG_FILE_NAME);

export const globalConfigExists = (): boolean =>
  existsSync(globalConfigPath());
