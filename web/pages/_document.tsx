import React from 'react';
import Document, {
    DocumentContext,
    Head,
    Html,
    Main,
    NextScript,
} from 'next/document';
import { ServerStyles, createStylesServer } from '@mantine/next';
import getConfig from 'next/config';
import { emotionCache } from 'lib/emotion';
import { description, themeColors, title } from '@config/app';

const { publicRuntimeConfig } = getConfig();

const nonce = publicRuntimeConfig.nonce;

const stylesServer = createStylesServer(emotionCache);

export default class _Document extends Document {
    static async getInitialProps(ctx: DocumentContext) {
        const initialProps = await Document.getInitialProps(ctx);

        return {
            ...initialProps,
            styles: [
                initialProps.styles,
                <ServerStyles
                    html={initialProps.html}
                    server={stylesServer}
                    key="styles"
                />,
            ],
        };
    }

    render() {
        return (
            <Html lang="en">
                <Head nonce={nonce}>
                    <meta charSet="utf-8" />
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                    <meta property="csp-nonce" content={nonce} />

                    {/* PWA properties */}
                    <meta name="application-name" content={title} />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta
                        name="apple-mobile-web-app-status-bar-style"
                        content="default"
                    />
                    <meta name="apple-mobile-web-app-title" content={title} />
                    <meta name="description" content={description} />
                    <meta name="format-detection" content="telephone=no" />
                    <meta name="mobile-web-app-capable" content="yes" />
                    <meta
                        name="msapplication-config"
                        content="/browserconfig.xml"
                    />
                    <meta
                        name="msapplication-TileColor"
                        content={themeColors.primary}
                    />
                    <meta name="msapplication-tap-highlight" content="no" />
                    <meta name="theme-color" content={themeColors.primary} />

                    <link
                        rel="apple-touch-icon"
                        href="/icons/apple-touch-icon.png"
                    />
                    <link
                        rel="apple-touch-icon"
                        sizes="152x152"
                        href="/icons/touch-icon-ipad.png"
                    />
                    <link
                        rel="apple-touch-icon"
                        sizes="180x180"
                        href="/icons/touch-icon-iphone-retina.png"
                    />
                    <link
                        rel="apple-touch-icon"
                        sizes="167x167"
                        href="/icons/touch-icon-ipad-retina.png"
                    />

                    <link
                        rel="icon"
                        type="image/png"
                        sizes="32x32"
                        href="/icons/favicon-32x32.png"
                    />
                    <link
                        rel="icon"
                        type="image/png"
                        sizes="16x16"
                        href="/icons/favicon-16x16.png"
                    />
                    <link rel="manifest" href="/manifest.json" />
                    <link
                        rel="mask-icon"
                        href="/icons/handshake.svg"
                        color={themeColors.primary}
                    />
                    <link rel="shortcut icon" href="/favicon.ico" />
                </Head>
                <body>
                    <Main />
                    <NextScript nonce={nonce} />
                </body>
            </Html>
        );
    }
}
