export interface MtvRoomCreationFormDatePickerProps {
    date: Date;
    minimiumDate?: Date;
    maximumDate?: Date;
    onConfirm: (date: Date) => void;
    onCancel?: () => void;
    title: string;
    testID?: string;
}
