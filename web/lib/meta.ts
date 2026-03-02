import type { MetaDescriptor } from 'react-router';
import { title as appTitle, description as appDescription } from '@config/app';

const SITE_URL = 'https://deadrop.io';

export interface MetaConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  noIndex?: boolean;
  canonical?: string;
}

/**
 * Build SEO and PWA optimized meta tags for React Router route modules
 * Based on next-seo configuration from Next.js app
 */
export function buildMeta(config: MetaConfig = {}): MetaDescriptor[] {
  const {
    title = appTitle,
    description = appDescription,
    image,
    url,
    type = 'website',
    keywords = [],
    noIndex = false,
    canonical,
  } = config;

  const fullTitle = title === appTitle ? title : `${title} | ${appTitle}`;
  const absoluteUrl = url?.startsWith('http') ? url : url ? `${SITE_URL}${url}` : SITE_URL;

  const meta: MetaDescriptor[] = [
    // Basic meta
    { title: fullTitle },
    { name: 'description', content: description },

    // Keywords (if provided)
    ...(keywords.length > 0 ? [{ name: 'keywords', content: keywords.join(', ') }] : []),

    // Open Graph
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: appTitle },
    { property: 'og:url', content: absoluteUrl },

    // Twitter Card
    { name: 'twitter:card', content: 'app' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },

    // Indexing
    ...(noIndex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),

    // Canonical URL
    ...(canonical ? [{ tagName: 'link', rel: 'canonical', href: canonical }] : []),
  ];

  // Add image tags only if image is provided
  if (image) {
    const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;
    meta.push(
      { property: 'og:image', content: absoluteImage },
      { property: 'og:image:alt', content: title },
      { name: 'twitter:image', content: absoluteImage },
      { name: 'twitter:image:alt', content: title }
    );
  }

  return meta;
}

/**
 * Merge custom meta tags with base meta config
 */
export function mergeMeta(
  baseMeta: MetaDescriptor[],
  customMeta: MetaDescriptor[] = []
): MetaDescriptor[] {
  const merged = [...baseMeta];

  customMeta.forEach(custom => {
    const existingIndex = merged.findIndex(base => {
      if ('name' in base && 'name' in custom) return base.name === custom.name;
      if ('property' in base && 'property' in custom) return base.property === custom.property;
      if ('title' in base && 'title' in custom) return true;
      return false;
    });

    if (existingIndex >= 0) {
      merged[existingIndex] = custom;
    } else {
      merged.push(custom);
    }
  });

  return merged;
}

/**
 * Quick helper for building article/blog post meta
 */
export function buildArticleMeta(config: Omit<MetaConfig, 'type'> & {
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}): MetaDescriptor[] {
  const { author, publishedTime, modifiedTime, section, tags, ...baseConfig } = config;

  const baseMeta = buildMeta({ ...baseConfig, type: 'article' });

  const articleMeta: MetaDescriptor[] = [
    ...(author ? [{ property: 'article:author', content: author }] : []),
    ...(publishedTime ? [{ property: 'article:published_time', content: publishedTime }] : []),
    ...(modifiedTime ? [{ property: 'article:modified_time', content: modifiedTime }] : []),
    ...(section ? [{ property: 'article:section', content: section }] : []),
    ...(tags?.map(tag => ({ property: 'article:tag', content: tag })) || []),
  ];

  return mergeMeta(baseMeta, articleMeta);
}
