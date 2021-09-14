/* eslint-disable @typescript-eslint/no-var-requires */
import { Platform } from 'react-native';
import { MtvRoomCreationFormDatePickerProps } from './MtvRoomCreationFormDatePickerContract';

const MtvRoomCreationFormDatePicker: React.FC<MtvRoomCreationFormDatePickerProps> =
    Platform.select({
        native: () => require('./MtvRoomCreationFormDatePickerNative').default,
        default: () => require('./MtvRoomCreationFormDatePickerWeb').default,
    })();

export default MtvRoomCreationFormDatePicker;

export * from './MtvRoomCreationFormDatePickerContract';
