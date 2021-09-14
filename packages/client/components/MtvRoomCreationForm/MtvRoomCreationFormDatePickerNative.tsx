import { Text, useSx } from 'dripsy';
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useFormatDateTime } from '../../hooks/useFormatDateTime';
import { useTextFieldStyles } from '../kit/TextField';
import { MtvRoomCreationFormDatePickerProps } from './MtvRoomCreationFormDatePickerContract';

const MtvRoomCreationFormDatePickerNative: React.FC<MtvRoomCreationFormDatePickerProps> =
    ({ title, date, onConfirm, onCancel, testID }) => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const sx = useSx();
        const textFieldStyles = useTextFieldStyles();
        const formattedDate = useFormatDateTime(date);

        function openModal() {
            setIsModalOpen(true);
        }

        function closeModal() {
            setIsModalOpen(false);
        }

        function handleConfirm(changedDate: Date) {
            onConfirm(changedDate);

            closeModal();
        }

        function handleClose() {
            onCancel?.();

            closeModal();
        }

        return (
            <>
                <TouchableOpacity
                    onPress={openModal}
                    style={[
                        textFieldStyles,
                        sx({
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }),
                    ]}
                >
                    <Text sx={{ color: 'white', fontSize: 's' }}>{title}</Text>

                    <Text sx={{ color: 'white', fontSize: 's' }}>
                        {formattedDate}
                    </Text>
                </TouchableOpacity>

                <DateTimePickerModal
                    isVisible={isModalOpen}
                    mode="datetime"
                    testID={testID}
                    onConfirm={handleConfirm}
                    onCancel={handleClose}
                />
            </>
        );
    };

export default MtvRoomCreationFormDatePickerNative;
