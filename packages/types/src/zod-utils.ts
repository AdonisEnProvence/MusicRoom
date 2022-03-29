export const trimString = (u: unknown): string | unknown =>
    typeof u === 'string' ? u.trim() : u;
