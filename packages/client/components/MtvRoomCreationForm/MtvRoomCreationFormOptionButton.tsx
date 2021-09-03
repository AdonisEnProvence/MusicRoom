import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, View, useSx } from 'dripsy';
import { TouchableOpacity } from 'react-native';

interface MtvRoomCreationFormOptionButtonProps {
    shouldApplyRightMargin: boolean;
    isSelected: boolean;
    text: string;
    onPress: () => void;
}

const MtvRoomCreationFormOptionButton: React.FC<MtvRoomCreationFormOptionButtonProps> =
    ({ text, isSelected, shouldApplyRightMargin, onPress }) => {
        const sx = useSx();

        return (
            <TouchableOpacity
                style={sx({
                    width: 110,
                    height: 100,
                    borderRadius: 's',
                    padding: 'l',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'greyLighter',

                    marginRight: shouldApplyRightMargin ? 'l' : undefined,
                })}
                accessibilityState={{
                    selected: isSelected,
                }}
                onPress={onPress}
            >
                {isSelected && (
                    <View
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            marginTop: -8,
                            marginLeft: -8,
                            backgroundColor: 'secondary',
                            borderRadius: 'full',

                            // Copy-pasted from https://ethercreative.github.io/react-native-shadow-generator/
                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 1,
                            },
                            shadowOpacity: 0.2,
                            shadowRadius: 1.41,

                            elevation: 2,
                        }}
                    >
                        <Ionicons name="checkmark" size={24} />
                    </View>
                )}

                <Text sx={{ color: 'white', textAlign: 'center' }}>{text}</Text>
            </TouchableOpacity>
        );
    };

export default MtvRoomCreationFormOptionButton;
