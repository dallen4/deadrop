import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn) {
      onSuccess();
      setShow(false);
      } else if (getCookie(TEST_FLAG_COOKIE))
        onVerify();
    }
  }, [isLoaded]);

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
