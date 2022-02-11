interface GenerateUserAvatarUriArgs {
    userID: string;
}

export function generateUserAvatarUri({
    userID,
}: GenerateUserAvatarUriArgs): string {
    return `https://avatars.dicebear.com/api/big-smile/${userID}.svg`;
}
