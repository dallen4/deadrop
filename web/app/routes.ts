import { type RouteConfig, route } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';
import glob from 'glob';

function mdxRoutes(): ReturnType<typeof route>[] {
    const files = glob.sync('docs/**/*.mdx');
    return files.map((file: string) => {
        const urlPath = file.replace('.mdx', '');
        return route(urlPath, './routes/doc.tsx', { id: urlPath });
    });
}

export default (async () => {
    const baseRoutes = await flatRoutes({ ignoredRouteFiles: ['docs'] });
    return [...baseRoutes, ...mdxRoutes()];
})() satisfies RouteConfig;
