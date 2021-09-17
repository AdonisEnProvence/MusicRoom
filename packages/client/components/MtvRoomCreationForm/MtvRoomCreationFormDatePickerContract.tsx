export interface MtvRoomCreationFormDatePickerProps {
    date?: Date;
    minimiumDate?: Date;
    maximumDate?: Date;
    onConfirm: (date: Date | undefined) => void;
    onCancel?: () => void;
    title: string;
    testID?: string;
}
