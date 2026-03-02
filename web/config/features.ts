import type { FeatureGroup } from 'molecules/sections/FeaturesBreakdown';

export const featureGroups: FeatureGroup[] = [
  {
    title: 'Core',
    emoji: '🔐',
    features: [
      { label: 'Raw text secret sharing', status: 'complete' },
      { label: 'JSON string secret sharing', status: 'complete' },
      { label: 'Secret file sharing', status: 'complete' },
      { label: 'Basic captcha protection via hCaptcha', status: 'complete' },
      { label: 'Authentication with Clerk', status: 'complete' },
      { label: 'CLI MVP implementation (basic drop & grab)', status: 'complete' },
      { label: 'VS Code Extension', status: 'scheduled' },
      { label: 'CLI authentication', status: 'scheduled' },
      { label: 'Multi-user sharing', status: 'scheduled' },
      { label: 'Drop passcode protection', status: 'scheduled' },
      { label: 'Dynamic QR codes', status: 'scheduled' },
    ],
  },
  {
    title: 'Vaults',
    emoji: '🗄️',
    features: [
      { label: 'Local vaults', status: 'in-progress' },
      { label: 'Cloud-synced, collaborative vaults', status: 'in-progress' },
      { label: 'Environment variable injection', status: 'in-progress' },
    ],
  },
];

export const allFeatures = featureGroups.flatMap((g) => g.features);

export const inProgressFeatures = allFeatures.filter(
  (f) => f.status === 'in-progress',
);

export const scheduledFeatures = allFeatures.filter(
  (f) => f.status === 'scheduled',
);

export const completeFeatures = allFeatures.filter(
  (f) => f.status === 'complete',
);
