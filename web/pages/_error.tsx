import * as Sentry from '@sentry/nextjs';
import NextErrorComponent from 'next/error';
import { NextPageContext } from 'next/types';

const CustomErrorComponent = (props: { statusCode: number }) => {
  return <NextErrorComponent statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async (contextData: NextPageContext) => {
  await Sentry.captureUnderscoreErrorException(contextData);
  return NextErrorComponent.getInitialProps(contextData);
};

export default CustomErrorComponent;
