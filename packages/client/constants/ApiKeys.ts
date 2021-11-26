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
