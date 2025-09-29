import { Title } from '@mantine/core';

import classes from './SectionTitle.module.css';

export function SectionTitle({ id, label }: { id: string; label: string }) {

    return (
        <Title id={id} ta={'center'} className={classes.title}>
            {label}
        </Title>
    );
}
