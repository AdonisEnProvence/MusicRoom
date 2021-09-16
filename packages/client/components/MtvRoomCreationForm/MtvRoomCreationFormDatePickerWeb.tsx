import { format } from 'date-fns';
import { Text, View, useSx } from 'dripsy';
import React from 'react';
import { useTextFieldStyles } from '../kit/TextField';
import { MtvRoomCreationFormDatePickerProps } from './MtvRoomCreationFormDatePickerContract';

function formatDateToDatetimeLocal(date: Date): string {
    return format(date, "yyyy-MM-dd'T'HH:mm");
}

const MtvRoomCreationFormDatePickerWeb: React.FC<MtvRoomCreationFormDatePickerProps> =
    ({ title, date, minimiumDate, maximumDate, onConfirm }) => {
        const sx = useSx();
        const textFieldStyles = useTextFieldStyles();
        const formattedDateForInputValue = formatDateToDatetimeLocal(date);
        const formattedMinimumDateForInputValue =
            minimiumDate !== undefined
                ? formatDateToDatetimeLocal(minimiumDate)
                : undefined;
        const formattedMaximumDateForInputValue =
            maximumDate !== undefined
                ? formatDateToDatetimeLocal(maximumDate)
                : undefined;

        return (
            <View
                style={[
                    textFieldStyles,
                    sx({
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }),
                ]}
            >
                <Text sx={{ color: 'white', fontSize: 's' }}>{title}</Text>

                <input
                    type="datetime-local"
                    placeholder="Datetime"
                    value={formattedDateForInputValue}
                    min={formattedMinimumDateForInputValue}
                    max={formattedMaximumDateForInputValue}
                    onChange={({ target: { value } }) => {
                        const dateFromText = new Date(value);

                        onConfirm(dateFromText);
                    }}
                />
            </View>
        );
    };

export default MtvRoomCreationFormDatePickerWeb;
