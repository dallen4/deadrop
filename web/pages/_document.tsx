import React from 'react';
import Document, {
    DocumentContext,
    Head,
    Html,
    Main,
    NextScript,
} from 'next/document';
import getConfig from 'next/config';
import { description, themeColors, title } from '@config/app';
import { Assets } from 'atoms/Assets';

const { publicRuntimeConfig } = getConfig();

const nonce = publicRuntimeConfig.nonce;

export default class _Document extends Document {

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

                    <Assets />
                </Head>
                <body>
                    <Main />
                    <NextScript nonce={nonce} />
                </body>
            </Html>
        );
    }
}
