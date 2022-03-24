import * as z from 'zod';

export const TokenTypeName = z.enum(['EMAIL_CONFIRMATION', 'PASSWORD_RESET']);
export type TokenTypeName = z.infer<typeof TokenTypeName>;
