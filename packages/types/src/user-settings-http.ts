import * as z from 'zod';
import { UserSettingVisibility } from './user-settings';

export const UpdatePlaylistsVisibilityRequestBody = z.object({
    tmpAuthUserID: z.string(),

    visibility: UserSettingVisibility,
});
export type UpdatePlaylistsVisibilityRequestBody = z.infer<
    typeof UpdatePlaylistsVisibilityRequestBody
>;

export const UpdatePlaylistsVisibilityResponseBody = z.object({
    status: z.enum(['SUCCESS']),
});
export type UpdatePlaylistsVisibilityResponseBody = z.infer<
    typeof UpdatePlaylistsVisibilityResponseBody
>;

export const UpdateRelationsVisibilityRequestBody = z.object({
    tmpAuthUserID: z.string(),

    visibility: UserSettingVisibility,
});
export type UpdateRelationsVisibilityRequestBody = z.infer<
    typeof UpdateRelationsVisibilityRequestBody
>;

export const UpdateRelationsVisibilityResponseBody = z.object({
    status: z.enum(['SUCCESS']),
});
export type UpdateRelationsVisibilityResponseBody = z.infer<
    typeof UpdateRelationsVisibilityResponseBody
>;
