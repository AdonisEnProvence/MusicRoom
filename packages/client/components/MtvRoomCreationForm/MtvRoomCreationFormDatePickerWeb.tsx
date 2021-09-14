import { format } from 'date-fns';
import { Text, View, useSx } from 'dripsy';
import React from 'react';
import { useTextFieldStyles } from '../kit/TextField';
import { MtvRoomCreationFormDatePickerProps } from './MtvRoomCreationFormDatePickerContract';

const MtvRoomCreationFormDatePickerWeb: React.FC<MtvRoomCreationFormDatePickerProps> =
    ({ title, date, onConfirm }) => {
        const sx = useSx();
        const textFieldStyles = useTextFieldStyles();
        const formattedDateForInputValue = format(date, "yyyy-MM-dd'T'hh:mm");

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
                    onChange={({ target: { value } }) => {
                        const dateFromText = new Date(value);

                        onConfirm(dateFromText);
                    }}
                />
            </View>
        );
    };

export default MtvRoomCreationFormDatePickerWeb;
