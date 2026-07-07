import {
  Accordion,
  Container,
  SimpleGrid,
  Table,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { TIERS } from '@shared/config/tiers';
import { PricingTierCard } from 'molecules/PricingTierCard';
import { SectionTitle } from './SectionTitle';
import classes from './PricingSection.module.css';

const FEATURES_TABLE = [
  {
    label: 'Daily drops',
    values: ['5', '15', 'Unlimited', 'Unlimited'],
  },
  {
    label: 'Local vaults',
    values: [true, true, true, true],
  },
  {
    label: 'CLI access',
    values: [true, true, true, true],
  },
  {
    label: 'VSCode extension',
    values: [false, true, true, true],
  },
  {
    label: 'Cloud-synced vaults',
    values: [false, '1 vault', '3 vaults', 'Unlimited'],
  },
  {
    label: 'Environments per vault',
    values: ['—', '3 (renamable)', 'Unlimited', 'Unlimited'],
  },
  {
    label: 'CI/CD service tokens',
    values: [false, 'Up to 10', 'Unlimited', 'Unlimited'],
  },
  {
    label: 'hCaptcha on drops',
    values: ['Yes', false, false, false],
  },
  {
    label: 'Read-only vault sharing',
    values: [false, false, true, true],
  },
  {
    label: 'Write delegation to humans',
    values: [false, false, 'Up to 5', 'Unlimited'],
  },
  {
    label: 'Audit log',
    values: [false, false, 'Last 30 days', 'Full + export'],
  },
  {
    label: 'SSO',
    values: [false, false, false, true],
  },
  {
    label: 'Role-based env access',
    values: [false, false, false, true],
  },
  {
    label: 'Priority support',
    values: [false, false, false, true],
  },
];

const FAQS = [
  {
    id: 'supporter-vs-lifetime',
    question:
      'How does Supporter differ from the old lifetime license?',
    answer:
      'The old $15 lifetime license has been renamed to Supporter. If you purchased it previously, your account is automatically grandfathered in with the same features. "Lifetime" implied indefinite support obligations we could not guarantee; "Supporter" reflects what it is — backing the project as a solo developer.',
  },
  {
    id: 'pro-collaboration',
    question: 'Who counts toward the Pro write-delegation cap?',
    answer:
      'Each human collaborator you grant write access to a vault counts as one slot. CI/CD service tokens do not count — those are separate. Pro allows up to 5 human delegates per vault.',
  },
  {
    id: 'org-seats',
    question: 'How are Org seats counted?',
    answer:
      'Org seats are billed per organization member. Service accounts (CI/CD) are separate from seat counts and are included at no extra charge. The 3-seat minimum applies to the base subscription.',
  },
  {
    id: 'drop-expiry',
    question: 'Can I extend how long a drop link stays valid?',
    answer:
      'No — drops are intentionally ephemeral one-shots regardless of plan. If you need repeatable or persistent access to a secret, that is exactly what vaults are for. Extending drops would blur the semantic line between the two primitives.',
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)
    return (
      <Text size="sm" className={classes.tableCheck} fw={600}>
        ✓
      </Text>
    );
  if (value === false)
    return (
      <Text size="sm" className={classes.tableDash}>
        —
      </Text>
    );
  return <Text size="sm">{value}</Text>;
}

export function PricingSection() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <Container size="lg" className={classes.wrapper}>
      <SectionTitle label="Plans" id="pricing-section" />

      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 4 }}
        spacing="lg"
        mt="xl"
      >
        {TIERS.map((tier) => (
          <PricingTierCard key={tier.tierName} {...tier} />
        ))}
      </SimpleGrid>

      {!isMobile && (
        <Container size="md" className={classes.tableWrapper}>
          <Table
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
          >
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '17.5%' }} />
              <col style={{ width: '17.5%' }} />
              <col style={{ width: '17.5%' }} />
              <col style={{ width: '17.5%' }} />
            </colgroup>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Feature</Table.Th>
                {TIERS.map((t) => (
                  <Table.Th key={t.tierName}>
                    <Text className={classes.tierName} size="sm">
                      {t.tierName}
                    </Text>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {FEATURES_TABLE.map((row) => (
                <Table.Tr key={row.label}>
                  <Table.Td>
                    <Text size="sm">{row.label}</Text>
                  </Table.Td>
                  {row.values.map((v, i) => (
                    <Table.Td key={i}>
                      <CellValue value={v as boolean | string} />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Container>
      )}

      <Container size="sm" className={classes.faqWrapper}>
        <SectionTitle label="FAQs" id="pricing-faq-section" />
        <Accordion variant="separated" mt="md">
          {FAQS.map(({ id, question, answer }) => (
            <Accordion.Item
              key={id}
              className={classes.faqItem}
              value={id}
            >
              <Accordion.Control className={classes.faqQuestion}>
                {question}
              </Accordion.Control>
              <Accordion.Panel>{answer}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>
    </Container>
  );
}
