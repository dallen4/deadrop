import { createEmotionCache } from '@mantine/core';
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig();

const nonce = publicRuntimeConfig.nonce;

export const emotionCache = createEmotionCache({ key: 'styles', nonce });
