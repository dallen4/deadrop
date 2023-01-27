export const get = async <Data>(
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

export const post = async <Data, Body>(
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

export const deleteReq = async <Data, Body>(path: string, body?: Body) => {
    const res = await fetch(path, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    return res.json() as Promise<Data>;
};
