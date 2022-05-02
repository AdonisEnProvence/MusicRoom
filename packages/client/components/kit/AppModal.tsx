import { useSx, View } from 'dripsy';
import { View as MotiView } from 'moti';
import React from 'react';

const AppModal: React.FC = ({ children }) => {
    const sx = useSx();

    return (
        <View
            sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 'xl',
            }}
        >
            <MotiView
                from={{
                    opacity: 0.4,
                }}
                animate={{
                    opacity: 0.4,
                }}
                exit={{
                    opacity: 0,
                }}
                transition={{
                    type: 'timing',
                    duration: 300,
                }}
                style={sx({
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    backgroundColor: 'primary',
                })}
            />

            <MotiView
                from={{
                    opacity: 1,
                    scale: 1,
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                }}
                exit={{
                    opacity: 0,
                    scale: 0.9,
                }}
                transition={{
                    type: 'timing',
                    duration: 300,
                }}
                style={sx({
                    width: '100%',
                    maxWidth: 420,
                    padding: 'l',
                    borderRadius: 'm',
                    backgroundColor: 'rgb(63, 63, 70)',

                    // Copy-pasted from https://ethercreative.github.io/react-native-shadow-generator/
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,

                    elevation: 5,
                })}
            >
                {children}
            </MotiView>
        </View>
    );
};

export default AppModal;
