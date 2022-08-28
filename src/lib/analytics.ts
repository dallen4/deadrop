import ReactGA from 'react-ga';

export const initGA = () => {
    ReactGA.initialize(process.env.GOOGLE_ANALYTICS_ID as string);
};

export const logPageView = (url: string) => {
    ReactGA.set({ page: url });
    ReactGA.pageview(url);
};

export const logEvent = (event: any) => {
    ReactGA.event(event);
};
