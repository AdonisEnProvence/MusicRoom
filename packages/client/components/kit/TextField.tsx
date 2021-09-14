import { styled, useSx } from 'dripsy';
import { TextInput as RNTextInput } from 'react-native';

const TextFieldStyles: import('@theme-ui/css').ThemeUICSSProperties = {
    padding: 'm',
    borderWidth: 0,
    borderRadius: 's',
    color: 'text',
    backgroundColor: 'greyLight',
    fontSize: 's',
};

export function useTextFieldStyles(): Record<string, unknown> {
    const sx = useSx();

    return sx(TextFieldStyles);
}

const TextField = styled(RNTextInput)(() => TextFieldStyles);

export default TextField;
