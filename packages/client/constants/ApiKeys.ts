import * as z from 'zod';

export const RAW_GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
export const GOOGLE_PLACES_API_KEY = z
    .string()
    .parse(RAW_GOOGLE_PLACES_API_KEY);

export const RAW_GOOGLE_MAPS_JAVASCRIPT_API_KEY =
    process.env.GOOGLE_MAPS_JAVASCRIPT_API_KEY;
export const GOOGLE_MAPS_JAVASCRIPT_API_KEY = z
    .string()
    .parse(RAW_GOOGLE_MAPS_JAVASCRIPT_API_KEY);

export const GOOGLE_AUTH_SESSION_EXPO_CLIENT_ID = z
    .string()
    .parse(process.env.GOOGLE_AUTH_SESSION_EXPO_CLIENT_ID);

export const GOOGLE_AUTH_SESSION_IOS_CLIENT_ID = z
    .string()
    .parse(process.env.GOOGLE_AUTH_SESSION_IOS_CLIENT_ID);

export const GOOGLE_AUTH_SESSION_ANDROID_CLIENT_ID = z
    .string()
    .parse(process.env.GOOGLE_AUTH_SESSION_ANDROID_CLIENT_ID);

export const GOOGLE_AUTH_SESSION_WEB_CLIENT_ID = z
    .string()
    .parse(process.env.GOOGLE_AUTH_SESSION_WEB_CLIENT_ID);

export const ADONIS_API_PRODUCTION_ENDPOINT = z
    .string()
    .parse(process.env.ADONIS_API_PRODUCTION_ENDPOINT);
