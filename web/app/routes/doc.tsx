import type { Route } from './+types/doc';
import { Doc } from '../docs';

export const loader = async ({ request }: Route.LoaderArgs) => {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/docs\//, '');
    return { slug };
};

export default function DocPage() {
    return <Doc />;
}
