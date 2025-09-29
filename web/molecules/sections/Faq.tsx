import React from 'react';
import { Container, Accordion } from '@mantine/core';
import { SectionTitle } from './SectionTitle';

// based off of: https://ui.mantine.dev/category/faq

import classes from './Faq.module.css';

const questions = [
  {
    id: 'drop-types',
    question: 'What kinds of data can I drop?',
    answer:
      'Currently, we support raw text strings, JSON strings, and most basic configuration files such as .yml and .json.',
  },
  {
    id: 'encryption-standards',
    question:
      'What cryptographic standards are leveraged to secure the handoff?',
    answer:
      'Deadrop leverages a variation of the AES algorithm and verifies integrity by computing and comparing SHA-256 hash signatures.',
  },
  {
    id: 'secrets-persistence',
    question:
      'Where are keys stored or persisted during and after a drop?',
    answer:
      'Neither public nor private keys are ever persisted on disk anywhere. Key pairs are kept in-memory only during the lifetime of the session and are immediately destroyed upon completion. They are also never sent to any servers or APIs, only being transmitted over secure peer-to-peer WebRTC connections.',
  },
  {
    id: 'peer-count',
    question: 'How many people can I drop a secret to at once?',
    answer:
      'There can only be one dropper (sender) and one grabber (receiver) within a deadrop session. Support for multi-user drops is in the roadmap as a premium feature.',
  },
  {
    id: 'available-platforms',
    question: 'Is this service only available as a web application?',
    answer:
      'The first stable iteration of the CLI recently shipped and the roadmap includes a VS Code extension and cloud-synced vaults.',
  },
];

export function Faq() {

  return (
    <Container size={'sm'} className={classes.wrapper}>
      <SectionTitle label={'FAQs'} id={'faq-section'} />

      <Accordion variant={'separated'} defaultValue={questions[0].id}>
        {questions.map(({ id, question, answer }, index) => (
          <Accordion.Item
            key={index}
            className={classes.item}
            value={id}
          >
            <Accordion.Control className={classes.question}>
              {question}
            </Accordion.Control>
            <Accordion.Panel>{answer}</Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Container>
  );
}
