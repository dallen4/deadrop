export const getIpInfo = async (ipAddress: string) => {
    const token = process.env.IPINFO_IO_TOKEN!;
    const url = `https://ipinfo.io/${ipAddress}?token=${token}`;

    const resp = await fetch(url);

    const info = await resp.json();

    return info;
};
