import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import { ServerStyles, createStylesServer } from '@mantine/next';
import { createEmotionCache } from '@mantine/core';
import getConfig from 'next/config';
import { emotionCache } from '@lib/emotion';

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
                <Head nonce={'test'}>
                    <meta charSet="utf-8" />
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                    <meta property="csp-nonce" content={nonce} />
                    {/* PWA primary color */}
                    {/* <meta name="theme-color" content={theme.palette.primary.main} /> */}
                </Head>
                <body>
                    <Main />
                    <NextScript nonce={nonce} />
                </body>
            </Html>
        );
    }
}
