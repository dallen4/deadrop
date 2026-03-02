import type { MDXComponents } from 'mdx/types';
import type { ComponentType } from 'react';
import { useLoaderData } from 'react-router';
import { useMDXComponents } from '../../mdx-components';

const mdxModules = import.meta.glob('/docs/**/*.mdx', { eager: true }) as Record<
    string,
    { default: ComponentType<{ components?: MDXComponents }> }
>;

export const Doc = () => {
    const { slug } = useLoaderData<{ slug: string }>();
    const components = useMDXComponents({});

    const mod = mdxModules[`/docs/${slug}.mdx`];
    if (!mod) {
        return <p>Document not found.</p>;
    }

    const MdxContent = mod.default;
    return <MdxContent components={components} />;
};
