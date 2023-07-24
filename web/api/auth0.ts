import { ManagementClient } from 'auth0';

const { host } = new URL(process.env.AUTH0_ISSUER_BASE_URL!);

export const auth0 = new ManagementClient<
    { [key: string]: any },
    { premium: true }
>({
    domain: host,
    token: process.env.AUTH0_TOKEN!,
});
