import { vi } from 'vitest';

export const window = {
  showWarningMessage: vi.fn(),
  showInputBox: vi.fn(),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
};

export const workspace = { workspaceFolders: undefined };
export const Uri = { joinPath: vi.fn(), file: vi.fn() };
export const ViewColumn = { One: 1 };
