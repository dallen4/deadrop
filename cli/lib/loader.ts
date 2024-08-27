import Ora from 'ora';
import type { Color } from 'ora';
export const loader = Ora();

export const startLoader = (msg: string) => loader.start(msg);

export const setMessage = (msg: string) => (loader.text = msg);

export const setSpinnerColor = (color: Color) =>
  (loader.color = color);

export const stopWithSuccess = (msg: string) => loader.succeed(msg);

export const stopWithWarn = (msg: string) => loader.warn(msg);

export const stopWithFail = (msg: string) => loader.fail(msg);
