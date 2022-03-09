import { Platform } from 'react-native';
import redaxios from 'redaxios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

const SHOULD_USE_TOKEN_AUTH = Platform.OS !== 'web';

type Requester = typeof redaxios & {
    /**
     * Tries to load the token from AsyncStorage and sets the Authorization header.
     * If token authentication should not be used, it's a no-op.
     * If the token is not found, it's a no-op.
     */
    loadToken(): Promise<void>;
    /**
     * Persists the token to AsyncStorage and sets the Authorization header.
     * If token authentication should not be used, it's a no-op.
     */
    persistToken(token: string): Promise<void>;
    /**
     * Removes the token from AsyncStorage and resets the Authorization header.
     * If token authentication should not be used, it's a no-op.
     * If the token is not found, it's a no-op.
     */
    clearToken(): Promise<void>;
};

/**
 * Creates a custom instance of redaxios that implements methods
 * to handle authentication by opaque tokens.
 */
export function createRequester(): Requester {
    const TOKEN_STORAGE_KEY = 'auth-token';

    const request: Requester = redaxios.create({
        baseURL: SERVER_ENDPOINT,
    });

    function setRequestAuthorizationHeader(token: string) {
        request.defaults.auth = `Bearer ${token}`;
    }

    async function loadToken(): Promise<void> {
        if (SHOULD_USE_TOKEN_AUTH === false) {
            return undefined;
        }

        const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (token === null) {
            return;
        }

        setRequestAuthorizationHeader(token);
    }

    async function persistToken(token: string): Promise<void> {
        if (SHOULD_USE_TOKEN_AUTH === false) {
            return undefined;
        }

        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);

        setRequestAuthorizationHeader(token);
    }

    async function clearToken(): Promise<void> {
        if (SHOULD_USE_TOKEN_AUTH === false) {
            return undefined;
        }

        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);

        delete request.defaults.auth;
    }

    request.loadToken = loadToken;
    request.persistToken = persistToken;
    request.clearToken = clearToken;

    return request;
}

/**
 * Singleton instance of our custom implementation of redaxios, that supports
 * authentication with opaque tokens.
 *
 * Should be used as a replacement for the default instance of redaxios.
 */
export const request = createRequester();
