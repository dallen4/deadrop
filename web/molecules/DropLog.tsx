import React, { useState } from 'react';
import { Button, Code, Collapse, Text } from '@mantine/core';

const DropLog = ({ logs }: { logs: Array<string> }) => {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <Text>Drop Logs</Text>
            <Button
                compact
                size={'sm'}
                variant={'light'}
                onClick={() => setOpen((prev) => !prev)}
            >
                {open ? 'hide' : 'show'}
            </Button>
            <Collapse in={open}>
                <Code block>
                    {logs.map((log, index) => (
                        <div key={index}>{log}</div>
                    ))}
                </Code>
            </Collapse>
        </div>
    );
};

export default DropLog;
