import { format, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';

export function formatDateTime(date: Date): string {
    return format(date, 'Pp', {
        locale: enUS,
    });
}

export function parseDateTimeString(dateString: string): Date {
    return parse(dateString, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
}

export function useFormatDateTime(date: Date): string {
    return formatDateTime(date);
}
