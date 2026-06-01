import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { getCookie } from 'cookies-next';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { TEST_FLAG_COOKIE } from '@shared/tests/http';
import { CAPTCHA_API_PATH } from '@shared/config/paths';
import { post } from '@shared/lib/fetch';
import { HCAPTCHA_EMBED_ID } from 'lib/constants';

export const Captcha = ({ onSuccess, onExpire }: CaptchaProps) => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );

  const [show, setShow] = useState(true);

  const { isLoaded, isSignedIn } = useUser();

  // e2e test-mode bypass. Deliberately independent of Clerk: the drop/grab
  // flow is public and must not be held hostage by clerk-js load state. If
  // this waited on `isLoaded`, any Clerk hiccup (CI bot detection, handshake)
  // would block the entire drop suite. Runs once on mount.
  useEffect(() => {
    if (getCookie(TEST_FLAG_COOKIE)) onVerify();
  }, []);

  // Signed-in users skip the captcha.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      onSuccess();
      setShow(false);
    }
  }, [isLoaded, isSignedIn]);

  const onVerify = async (token?: string) => {
    const resp = await post<{ success: boolean }, { token?: string }>(
      CAPTCHA_API_PATH,
      { token },
    );

    if (resp.success) onSuccess();
  };

  const onError = (event: string) => {
    console.warn(event);
  };

  return show ? (
    <HCaptcha
      id={HCAPTCHA_EMBED_ID}
      sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY!}
      size={isMobile ? 'compact' : 'normal'}
      onVerify={onVerify}
      onError={onError}
      onExpire={onExpire}
    />
  ) : (
    <></>
  );
};

type CaptchaProps = {
  onSuccess: () => void;
  onExpire: () => void;
};
