export function mockFetch(data: any) {
    return jest.fn().mockImplementation(() =>
        Promise.resolve({
            ok: true,
            json: () => data,
        }),
    );
}