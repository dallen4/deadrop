import React from 'react';
import Document, { Head, Html, Main, NextScript } from 'next/document';
import { ServerStyleSheets } from '@material-ui/core';
import theme from 'theme';

class CustomDocument extends Document {
    render() {
        return (
            <Html lang="en">
                <Head>
                    <meta charSet="utf-8" />
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                    {/* PWA primary color */}
                    {/* <meta name="theme-color" content={theme.palette.primary.main} /> */}

                    <link rel="preconnect" href="https://fonts.gstatic.com"/>
                    <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet"/>
                    {/* <link rel="icon" type="image/x-icon" href="/favicon.ico" /> */}
                    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
                </Head>
                <body style={{ backgroundColor: theme.palette.background.default }}>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}

CustomDocument.getInitialProps = async (ctx) => {
    // Resolution order
    //
    // On the server:
    // 1. app.getInitialProps
    // 2. page.getInitialProps
    // 3. document.getInitialProps
    // 4. app.render
    // 5. page.render
    // 6. document.render
    //
    // On the server with error:
    // 1. document.getInitialProps
    // 2. app.render
    // 3. page.render
    // 4. document.render
    //
    // On the client
    // 1. app.getInitialProps
    // 2. page.getInitialProps
    // 3. app.render
    // 4. page.render

    // Render app and page and get the context of the page with collected side effects.
    const sheets = new ServerStyleSheets();
    const originalRenderPage = ctx.renderPage;

    ctx.renderPage = () =>
        originalRenderPage({
            enhanceApp: (App) => (props) => sheets.collect(<App {...props} />),
        });

    const initialProps = await Document.getInitialProps(ctx);

    return {
        ...initialProps,
        // Styles fragment is rendered after the app and page rendering finish.
        styles: (
            <React.Fragment>
                {initialProps.styles}
                {sheets.getStyleElement()}
            </React.Fragment>
        ),
    };
};

export default CustomDocument;
