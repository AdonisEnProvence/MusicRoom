import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

export function formatDateTime(date: Date): string {
    return format(date, 'Pp', {
        locale: enUS,
    });
}

export function useFormatDateTime(date: Date): string {
    return formatDateTime(date);
}
