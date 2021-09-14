export interface MtvRoomCreationFormDatePickerProps {
    date: Date;
    onConfirm: (date: Date) => void;
    onCancel?: () => void;
    title: string;
    testID?: string;
}
