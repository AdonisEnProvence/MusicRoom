import * as z from 'zod';

export const UserSettingVisibility = z.enum([
    'PUBLIC',
    'PRIVATE',
    'FOLLOWERS_ONLY',
]);
export type UserSettingVisibility = z.infer<typeof UserSettingVisibility>;
