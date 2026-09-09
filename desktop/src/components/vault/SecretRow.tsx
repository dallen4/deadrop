import { useRef, useState } from 'react';
import {
  ActionIcon,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconCheck,
  IconClipboard,
  IconCopy,
  IconDots,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';
import { EditSecretModal } from './EditSecretModal';

const REVEAL_TIMEOUT_MS = 15_000;

export const SecretRow = ({
  name,
  environment,
  readOnly,
  onReveal,
  onUpdate,
  onRename,
  onDelete,
  onDrop,
  copyTargets,
  onCopyTo,
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
  onDrop: (name: string, environment: string) => void;
  // Sibling environments this secret can be copied into, flagged when a
  // secret of the same name is already there and would be replaced.
  copyTargets: { environment: string; exists: boolean }[];
  onCopyTo: (
    name: string,
    fromEnv: string,
    toEnv: string,
  ) => Promise<void>;
}) => {
  const [revealedValue, setRevealedValue] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const clipboard = useClipboard({ timeout: 2000 });
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleReveal = async () => {
    if (revealedValue !== null) {
      setRevealedValue(null);
      clearTimeout(hideTimer.current);
      return;
    }
    setBusy(true);
    try {
      const value = await onReveal(name, environment);
      setRevealedValue(value);
      hideTimer.current = setTimeout(
        () => setRevealedValue(null),
        REVEAL_TIMEOUT_MS,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    setBusy(true);
    try {
      clipboard.copy(
        revealedValue ?? (await onReveal(name, environment)),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={0} py={2} style={{ minWidth: 0 }}>
      <Group justify={'space-between'} wrap={'nowrap'}>
        <Text
          // Mantine jumps sm(14) to md(16) with nothing between; monospace
          // reads cramped at sm and shouty at md, so this splits them.
          fz={15}
          ff={'monospace'}
          style={{ flex: 1, minWidth: 0 }}
          truncate
        >
          {name}
        </Text>

        <Group gap={4} wrap={'nowrap'}>
          <Tooltip label={revealedValue !== null ? 'Hide' : 'Reveal'}>
            <ActionIcon
              size={'lg'}
              variant={'subtle'}
              loading={busy}
              aria-label={`${
                revealedValue !== null ? 'Hide' : 'Reveal'
              } ${name}`}
              onClick={() => void handleReveal()}
            >
              {revealedValue !== null ? (
                <IconEyeOff size={18} />
              ) : (
                <IconEye size={18} />
              )}
            </ActionIcon>
          </Tooltip>
          {!readOnly && (
            <Tooltip label={'Edit'}>
              <ActionIcon
                size={'lg'}
                variant={'subtle'}
                aria-label={`Edit ${name}`}
                onClick={() => setEditing(true)}
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          <Menu position={'bottom-end'} width={180}>
            <Menu.Target>
              <ActionIcon
                size={'lg'}
                variant={'subtle'}
                aria-label={`More actions for ${name}`}
              >
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Sub>
                <Menu.Sub.Target>
                  <Menu.Sub.Item
                    leftSection={
                      clipboard.copied ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconCopy size={16} />
                      )
                    }
                  >
                    {clipboard.copied ? 'Copied' : 'Copy to'}
                  </Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                  <Menu.Item
                    leftSection={<IconClipboard size={16} />}
                    onClick={() => void handleCopy()}
                  >
                    Clipboard
                  </Menu.Item>
                  {!readOnly && copyTargets.length > 0 && (
                    <>
                      <Menu.Divider />
                      {copyTargets.map((target) => (
                        <Menu.Item
                          key={target.environment}
                          onClick={() =>
                            void onCopyTo(
                              name,
                              environment,
                              target.environment,
                            )
                          }
                          rightSection={
                            target.exists ? (
                              <Text size={'xs'} c={'dimmed'}>
                                replace
                              </Text>
                            ) : undefined
                          }
                        >
                          {target.environment}
                        </Menu.Item>
                      ))}
                    </>
                  )}
                </Menu.Sub.Dropdown>
              </Menu.Sub>
              <Menu.Item
                leftSection={<IconSend size={16} />}
                onClick={() => onDrop(name, environment)}
              >
                Drop secret
              </Menu.Item>
              {!readOnly && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    color={'red'}
                    leftSection={<IconTrash size={16} />}
                    onClick={() => void onDelete(name, environment)}
                  >
                    Delete
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {revealedValue !== null && (
        <Text
          size={'sm'}
          c={'dimmed'}
          ff={'monospace'}
          truncate
          // Ellipsised at the pane edge rather than wrapping, so revealing
          // never reflows the list.
          style={{ width: '100%', minWidth: 0 }}
        >
          {revealedValue}
        </Text>
      )}

      <EditSecretModal
        opened={editing}
        onClose={() => setEditing(false)}
        name={name}
        environment={environment}
        onReveal={onReveal}
        onUpdate={onUpdate}
        onRename={onRename}
      />
    </Stack>
  );
};
