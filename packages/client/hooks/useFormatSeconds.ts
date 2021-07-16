import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useMemo } from 'react';

export function useFormatSeconds(ms: number): string {
    const truncatedSecondsToMilliseconds = Math.trunc(ms / 1000) * 1000;
    const formattedTime = useMemo(() => {
        return format(truncatedSecondsToMilliseconds, 'mm:ss', {
            locale: enUS,
        });
    }, [truncatedSecondsToMilliseconds]);

    return formattedTime;
}
