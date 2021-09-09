import * as z from 'zod';

export const GOOGLE_PLACES_API_KEY = z
    .string()
    .parse(process.env.GOOGLE_PLACES_API_KEY);
