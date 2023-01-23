import QRCode from 'qrcode';

export const generateQR = (input: string) => QRCode.toDataURL(input);
