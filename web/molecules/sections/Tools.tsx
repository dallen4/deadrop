import { Badge, Container, Text } from '@mantine/core';
import {
  IconBrowser,
  IconTerminal2,
  IconBrandVscode,
} from '@tabler/icons-react';
import { SectionTitle } from './SectionTitle';

import classes from './Tools.module.css';

const toolData = [
  {
    title: 'Web Application',
    status: 'stable',
    description: `Use the deadrop web app and even save it to your device's home screen as a PWA.`,
    icon: IconBrowser,
  },
  {
    title: 'CLI',
    status: 'stable',
    description: `Run deadrop directly in your terminal via npx — no install required.`,
    icon: IconTerminal2,
  },
  {
    title: 'VS Code',
    status: 'alpha',
    description: `Start a session in the sidebar or right-click a file to drop it without leaving your editor.`,
    icon: IconBrandVscode,
  },
];

const statusToColor: Record<string, string> = {
  stable: 'blue',
  alpha: 'orange',
  'in development': 'yellow',
};

export function Tools() {
  return (
    <Container size='lg' py='xl'>
      <SectionTitle label='Tools' id='tools-section' />
      <div className={classes.list} style={{ marginTop: 32 }}>
        {toolData.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.title} className={classes.row}>
              <div className={classes.iconWrap}>
                <Icon size={26} stroke={1.75} />
              </div>
              <div className={classes.content}>
                <Text className={classes.title}>{tool.title}</Text>
                <Text size='sm' className={classes.description}>
                  {tool.description}
                </Text>
              </div>
              <Badge
                className={classes.badge}
                size='lg'
                variant='light'
                color={statusToColor[tool.status]}
              >
                {tool.status}
              </Badge>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
