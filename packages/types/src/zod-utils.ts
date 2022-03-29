import * as z from 'zod';

export const trimString = (u: unknown): string => {
    const typedU = z.string().parse(u);
    return typedU.trim();
};
