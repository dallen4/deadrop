export const get = async <Data extends any>(
    path: string,
    params?: { [key: string]: any },
) => {
    let url = path;

    if (params) {
        const query = new URLSearchParams(params);
        url += '?' + query.toString();
    }

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data: Data = await res.json();

    return data;
};

export const post = async <Data extends any, Body extends any>(
    path: string,
    body?: Body,
    headers: HeadersInit = {},
) => {
    const res = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data: Data = await res.json();

    return data;
};
