import React from 'react';
import {
  ActionIcon,
  Button,
  Divider,
  Flex,
  Text,
  Title,
} from '@mantine/core';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons';
import { InlineCode } from 'atoms/Code';
import { MainWrapper } from 'atoms/MainWrapper';
import { useVault } from 'hooks/use-vault';

const Vault = () => {
  const { sendMessage, secrets } = useVault();

  return (
    <MainWrapper>
      <Flex direction={'row'} justify={'space-between'}>
        <Title>Vaults</Title>
        <Button
          size={'sm'}
          onClick={() => sendMessage({ type: 'get_config' })}
        >
          load
        </Button>
      </Flex>
      <Text size={'lg'}>
        Here you can manage your personal secrets for drops from this
        device or using in your projects.
      </Text>
      <Flex
        direction={'column'}
        justify={'flex-start'}
        rowGap={'sm'}
        mt={'lg'}
        px={'lg'}
        w={'100%'}
        style={{
          flex: 1,
          alignSelf: 'center',
        }}
      >
        {secrets.map((secret, index) => (
          <>
            <Flex
              key={index}
              direction={'row'}
              justify={'space-between'}
              align={'center'}
              columnGap={'sm'}
              px={'md'}
            >
              <InlineCode size={'md'}>{secret}</InlineCode>
              <Flex
                direction={'row'}
                justify={'space-between'}
                align={'center'}
                columnGap={'xs'}
              >
                <ActionIcon variant={'default'}>
                  <IconEdit />
                </ActionIcon>
                <ActionIcon variant={'default'}>
                  <IconTrash />
                </ActionIcon>
              </Flex>
            </Flex>
            {index <= 3 && <Divider />}
          </>
        ))}
        <Button mt={'sm'} fullWidth variant={'outline'} size={'md'}>
          <IconPlus /> Add Secret
        </Button>
      </Flex>
    </MainWrapper>
  );
};

export default Vault;
