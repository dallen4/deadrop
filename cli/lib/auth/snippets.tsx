import { FC, PropsWithChildren } from 'hono/jsx';
import { css, Style } from 'hono/css';

export const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="192"
    height="192"
    viewBox="0 0 512 512"
    style="background-color: #1A1B1E;"
  >
    <rect x="0" y="0" width="100%" height="100%" fill="#1A1B1E" />
    <g transform="translate(-44, 0)">
      <path
        d="M323.4 85.2l-96.8 78.4c-16.1 13-19.2 36.4-7 53.1c12.9 17.8 38 21.3 55.3 7.8l99.3-77.2c7-5.4 17-4.2 22.5 2.8s4.2 17-2.8 22.5l-20.9 16.2L512 316.8V128h-.7l-3.9-2.5L434.8 79c-15.3-9.8-33.2-15-51.4-15c-21.8 0-43 7.5-60 21.2zm22.8 124.4l-51.7 40.2C263 274.4 217.3 268 193.7 235.6c-22.2-30.5-16.6-73.1 12.7-96.8l83.2-67.3c-11.6-4.9-24.1-7.4-36.8-7.4C234 64 215.7 69.6 200 80l-72 48V352h28.2l91.4 83.4c19.6 17.9 49.9 16.5 67.8-3.1c5.5-6.1 9.2-13.2 11.1-20.6l17 15.6c19.5 17.9 49.9 16.6 67.8-2.9c4.5-4.9 7.8-10.6 9.9-16.5c19.4 13 45.8 10.3 62.1-7.5c17.9-19.5 16.6-49.9-2.9-67.8l-134.2-123zM16 128c-8.8 0-16 7.2-16 16V352c0 17.7 14.3 32 32 32H64c17.7 0 32-14.3 32-32V128H16zM48 320a16 16 0 1 1 0 32 16 16 0 1 1 0-32zM544 128V352c0 17.7 14.3 32 32 32h32c17.7 0 32-14.3 32-32V144c0-8.8-7.2-16-16-16H544zm32 208a16 16 0 1 1 32 0 16 16 0 1 1 -32 0z"
        style="fill:#1971c2; transform: scale(0.65); transform-origin: center center;"
      />
    </g>
  </svg>
);

export const Layout: FC<PropsWithChildren<{ title: string }>> = (
  props,
) => {
  return (
    <html>
      <head>
        <title>{props.title}</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@mantine/core@7.13.4/styles.min.css"
        />

        <Style>{css`
          body {
            margin: 0;
            padding: 0;
            background-color: #1a1b1e;
          }

          main {
            height: 100%;
            width: 100%;
          }
        `}</Style>
      </head>
      <body>{props.children}</body>
    </html>
  );
};

export const LoginSuccess = () => {
  return (
    <>
      <Style>{css`
        main {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main > div {
          text-align: center;
        }

        h1 {
          color: #1971c2;
        }

        h2 {
          color: rgb(248, 249, 250);
          line-height: 32px;
        }
      `}</Style>
      <Layout title="Login Success!">
        <main>
          <Logo />
          <div>
            <h1 class="styles-Text-root styles-Title-root">
              You're all set!
            </h1>
            <h2 class="styles-Text-root">
              You can safely close this tab and return to your
              terminal
            </h2>
          </div>
        </main>
      </Layout>
    </>
  );
};
