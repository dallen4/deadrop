import { useRef, useState } from 'react';
import {
  ActionIcon,
  CopyButton,
  Group,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconTrash,
} from '@tabler/icons-react';

const REVEAL_TIMEOUT_MS = 15_000;

export const SecretRow = ({
  name,
  environment,
  readOnly,
  onReveal,
  onUpdate,
  onRename,
  onDelete,
}: {
  name: string;
  environment: string;
  // A vault shared with you carries a read-only token; writes fail at Turso.
  readOnly?: boolean;
  onReveal: (name: string, environment: string) => Promise<string>;
  onUpdate: (
    name: string,
    environment: string,
    value: string,
  ) => Promise<void>;
  onRename: (
    oldName: string,
    newName: string,
    environment: string,
  ) => Promise<void>;
  onDelete: (name: string, environment: string) => Promise<void>;
}) => {
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleReveal = async () => {
    if (revealedValue !== null) {
      setRevealedValue(null);
      clearTimeout(hideTimer.current);
      return;
    }
    setRevealing(true);
    try {
      const value = await onReveal(name, environment);
      setRevealedValue(value);
      hideTimer.current = setTimeout(
        () => setRevealedValue(null),
        REVEAL_TIMEOUT_MS,
      );
    } finally {
      setRevealing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingValue === null) return;
    await onUpdate(name, environment, editingValue);
    setEditingValue(null);
  };

  const handleSaveRename = async () => {
    if (renameValue.trim() && renameValue !== name) {
      await onRename(name, renameValue.trim(), environment);
    }
    setRenaming(false);
  };

  if (editingValue !== null) {
    return (
      <Group gap={'xs'} py={4}>
        <TextInput
          size={'sm'}
          style={{ flex: 1 }}
          value={editingValue}
          onChange={(e) => setEditingValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSaveEdit();
            if (e.key === 'Escape') setEditingValue(null);
          }}
          autoFocus
        />
        <ActionIcon
          size={'sm'}
          color={'green'}
          onClick={() => void handleSaveEdit()}
        >
          <IconCheck size={14} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Group justify={'space-between'} py={4} wrap={'nowrap'}>
      {renaming ? (
        <TextInput
          size={'sm'}
          style={{ flex: 1 }}
          value={renameValue}
          onChange={(e) => setRenameValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSaveRename();
            if (e.key === 'Escape') setRenaming(false);
          }}
          autoFocus
        />
      ) : (
        <Text
          size={'sm'}
          ff={'monospace'}
          style={{ flex: 1, minWidth: 0, cursor: 'text' }}
          truncate
          onDoubleClick={() => {
            if (readOnly) return;
            setRenameValue(name);
            setRenaming(true);
          }}
        >
          {name}
          {revealedValue !== null && (
            <Text span size={'sm'} c={'dimmed'} ml={'sm'}>
              = {revealedValue}
            </Text>
          )}
        </Text>
      )}

      <Group gap={4} wrap={'nowrap'}>
        <Tooltip label={revealedValue !== null ? 'Hide' : 'Reveal'}>
          <ActionIcon
            size={'sm'}
            variant={'subtle'}
            loading={revealing}
            onClick={() => void handleReveal()}
          >
            {revealedValue !== null ? (
              <IconEyeOff size={14} />
            ) : (
              <IconEye size={14} />
            )}
          </ActionIcon>
        </Tooltip>
        <CopyButton
          value={revealedValue ?? ''}
          timeout={2000}
        >
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy'}>
              <ActionIcon
                size={'sm'}
                variant={'subtle'}
                disabled={revealedValue === null}
                color={copied ? 'teal' : undefined}
                onClick={copy}
              >
                {copied ? (
                  <IconCheck size={14} />
                ) : (
                  <IconCopy size={14} />
                )}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
        {!readOnly && (
          <>
            <Tooltip label={'Edit value'}>
              <ActionIcon
                size={'sm'}
                variant={'subtle'}
                onClick={() => setEditingValue('')}
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={'Delete'}>
              <ActionIcon
                size={'sm'}
                variant={'subtle'}
                color={'red'}
                onClick={() => void onDelete(name, environment)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      </Group>
    </Group>
  );
};
