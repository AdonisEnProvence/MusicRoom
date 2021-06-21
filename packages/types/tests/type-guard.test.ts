import { ZodError } from 'zod';
import { ISO8601Duration } from '../src';

describe('ISO8601Duration', () => {
    test('parses correct duration', () => {
        const correctDuration = 'P3Y6M4DT12H30M5S';

        expect(() => ISO8601Duration.parse(correctDuration)).not.toThrowError(
            ZodError,
        );
    });

    test('rejects incorrect duration', () => {
        const correctDuration = '3Y6M4DT12H30M5S';

        expect(() => ISO8601Duration.parse(correctDuration)).toThrowError(
            ZodError,
        );
    });
});
