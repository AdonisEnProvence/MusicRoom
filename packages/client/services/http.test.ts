import AsyncStorage from '@react-native-async-storage/async-storage';
import { Response } from 'node-fetch';
import { createRequester } from './http';

global.fetch = jest.fn().mockResolvedValue(new Response());

test('persistToken should persist the token to AsyncStorage and set the Authorization header', async () => {
    const request = createRequester();

    const token = '12345';

    await request.persistToken(token);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth-token', token);

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: {
                authorization: `Bearer ${token}`,
            },
        }),
    );
});

test('loadToken should load the token from AsyncStorage and set the Authorization header', async () => {
    const request = createRequester();

    const token = '12345';
    await AsyncStorage.setItem('auth-token', token);

    await request.loadToken();

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: {
                authorization: `Bearer ${token}`,
            },
        }),
    );
});

test('loadToken should do nothing if no token is in AsyncStorage', async () => {
    const request = createRequester();

    await request.loadToken();

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.any(Object),
    );
    expect(fetch).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
            headers: {
                authorization: expect.any(String),
            },
        }),
    );
});

test('clearToken removes the token from AsyncStorage and does not send Authorization header anymore', async () => {
    const request = createRequester();

    const token = '12345';
    await request.persistToken(token);

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: {
                authorization: `Bearer ${token}`,
            },
        }),
    );

    await request.clearToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth-token');

    await request.get('http://localhost:3000');
    expect(fetch).not.toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
            headers: {
                authorization: expect.any(String),
            },
        }),
    );
});
