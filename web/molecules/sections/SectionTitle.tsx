import { Title, createStyles } from '@mantine/core';

const useStyles = createStyles((theme) => ({
    title: {
        marginBottom: theme.spacing.xl * 1.5,
    },
}));

export function SectionTitle({ id, label }: { id: string; label: string }) {
    const { classes } = useStyles();

    return (
        <Title id={id} align={'center'} className={classes.title}>
            {label}
        </Title>
    );
}
