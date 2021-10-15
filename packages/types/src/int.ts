import * as z from 'zod';

export const PositiveInteger = z.number().int().nonnegative();
export type PositiveInteger = z.infer<typeof PositiveInteger>;

export const StrictlyPositiveInteger = z.number().int().positive();
export type StrictlyPositiveInteger = z.infer<typeof StrictlyPositiveInteger>;
