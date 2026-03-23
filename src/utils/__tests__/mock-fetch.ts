export function mockFetch(data: any) {
    return jest.fn().mockImplementation(() =>
        Promise.resolve({
            ok: true,
            json: () => data,
        }),
    );
}

export function mockFetchBy(cb: (fetchUrl: string) => any) {
    return jest.fn().mockImplementation((fetchUrl: string) => {
        return Promise.resolve({
            ok: true,
            json: () => cb(fetchUrl),
        });
    });
}