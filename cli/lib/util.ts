import { GRAB_PATH } from '@shared/config/paths';

export const generateGrabUrl = (id: string) => {
    const params = new URLSearchParams({ drop: id });
    const baseUrl = new URL(GRAB_PATH, process.env.DEADDROP_API_URL!);

    return `${baseUrl.toString()}?${params.toString()}`;
};
