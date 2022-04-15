import {
    REQUEST_HEADER_APP_VERSION_KEY,
    REQUEST_HEADER_DEVICE_INFORMATION,
    REQUEST_HEADER_DEVICE_OS,
} from '@musicroom/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Response } from 'node-fetch';
import { createRequester } from './http';
import * as ExpoConstantWrapper from './ExpoConstantsWrapper';

global.fetch = jest.fn().mockResolvedValue(new Response());

test('persistToken should persist the token to AsyncStorage and set the Authorization header', async () => {
    const request = createRequester();

    const token = '12345';
    await request.persistToken(token);

    const expectedheaders: Record<string, string> = {};
    expectedheaders.authorization = `Bearer ${token}`;
    expectedheaders[REQUEST_HEADER_DEVICE_INFORMATION] = 'mock';
    expectedheaders[REQUEST_HEADER_DEVICE_OS] = 'ios';

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth-token', token);

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: expectedheaders,
        }),
    );
});

test('loadToken should load the token from AsyncStorage and set the Authorization header', async () => {
    const request = createRequester();

    const token = '12345';
    await AsyncStorage.setItem('auth-token', token);

    const expectedheaders: Record<string, string> = {};
    expectedheaders.authorization = `Bearer ${token}`;
    expectedheaders[REQUEST_HEADER_DEVICE_INFORMATION] = 'mock';
    expectedheaders[REQUEST_HEADER_DEVICE_OS] = 'ios';

    await request.loadToken();

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: expectedheaders,
        }),
    );
});

test('getToken should return the token from AsyncStorage', async () => {
    const request = createRequester();

    const token = '12345';
    await AsyncStorage.setItem('auth-token', token);

    const retrievedToken = await request.getToken();
    expect(retrievedToken).toEqual(token);
});

test('getToken should return undefined as token is not set in AsyncStorage', async () => {
    const request = createRequester();

    const retrievedToken = await request.getToken();
    expect(retrievedToken).toBeUndefined();
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

    const expectedheaders: Record<string, string> = {};
    expectedheaders.authorization = `Bearer ${token}`;
    expectedheaders[REQUEST_HEADER_DEVICE_INFORMATION] = 'mock';
    expectedheaders[REQUEST_HEADER_DEVICE_OS] = 'ios';

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: expectedheaders,
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

test('It should set request headers by default', async () => {
    jest.spyOn(
        ExpoConstantWrapper,
        'getConstantAppVersionWrapper',
    ).mockReturnValue('app-version');
    jest.spyOn(ExpoConstantWrapper, 'getDeviceNameWrapper').mockReturnValue(
        'device-name',
    );
    jest.spyOn(ExpoConstantWrapper, 'getPlatformOsWrapper').mockReturnValue(
        'platform-os',
    );
    const request = createRequester();

    const token = '12345';
    await request.persistToken(token);

    const expectedheaders: Record<string, string> = {};
    expectedheaders.authorization = `Bearer ${token}`;
    expectedheaders[REQUEST_HEADER_DEVICE_OS] = 'platform-os';
    expectedheaders[REQUEST_HEADER_APP_VERSION_KEY] = 'app-version';
    expectedheaders[REQUEST_HEADER_DEVICE_INFORMATION] = 'device-name';

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: expectedheaders,
        }),
    );
});

test('It should not set undefined headers', async () => {
    jest.spyOn(
        ExpoConstantWrapper,
        'getConstantAppVersionWrapper',
    ).mockReturnValue(undefined);
    jest.spyOn(ExpoConstantWrapper, 'getDeviceNameWrapper').mockReturnValue(
        undefined,
    );
    jest.spyOn(ExpoConstantWrapper, 'getPlatformOsWrapper').mockReturnValue(
        'platform-os',
    );
    const request = createRequester();

    const token = '12345';
    await request.persistToken(token);

    const expectedheaders: Record<string, string> = {};
    expectedheaders.authorization = `Bearer ${token}`;
    expectedheaders[REQUEST_HEADER_DEVICE_OS] = 'platform-os';

    await request.get('http://localhost:3000');
    expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
            method: 'get',
            headers: expectedheaders,
        }),
    );
});
