import { ManagementClient } from 'auth0';
import { UserMetadata } from 'types/users';

const { host } = new URL(process.env.AUTH0_ISSUER_BASE_URL!);

export const auth0 = new ManagementClient<{ [key: string]: any }, UserMetadata>(
    {
        domain: host,
        clientId: process.env.AUTH0_CLIENT_ID!,
        clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    },
);

export const getUserById = async (id: string) => {
    const user = await auth0.getUser({ id });

    return {
        username: user.nickname,
        email: user.email,
        metadata: user.user_metadata,
    };
};

export const getUserIdsByEmail = async (email: string) => {
    const users = await auth0.getUsersByEmail(email);

    return users.map((user) => user.user_id!);
};

export const updateUser = async (id: string, data: UserMetadata) => {
    const updatedUser = await auth0.updateUserMetadata({ id }, data);

    return {
        username: updatedUser.nickname,
        email: updatedUser.email,
        metadata: updatedUser.user_metadata,
    };
};
