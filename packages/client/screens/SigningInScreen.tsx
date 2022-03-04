import { SafeAreaView, Text, useSx, View } from 'dripsy';
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { AppScreen, TextField } from '../components/kit';
import { useAppContext } from '../contexts/AppContext';
import { SigningInScreenProps } from '../types';

const SigningInScreen: React.FC<SigningInScreenProps> = () => {
    const sx = useSx();
    const { appService } = useAppContext();
    const [email, setEmail] = useState('devessier@devessier.fr');
    const [password, setPassword] = useState('devessierBgDu13');

    function handleSigningInSubmit() {
        appService.send({
            type: 'SIGN_IN',
            email,
            password,
        });
    }

    return (
        <AppScreen>
            <SafeAreaView sx={{ flex: 1 }}>
                <Text
                    sx={{
                        color: 'white',
                        fontSize: 'l',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginX: 'auto',
                        marginTop: 'xl',
                    }}
                >
                    MusicRoom
                </Text>

                <View
                    sx={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <View
                        sx={{
                            width: 520,
                            flexShrink: 1,
                        }}
                    >
                        <View sx={{ paddingX: 'l' }}>
                            <Text
                                sx={{
                                    color: 'white',
                                    fontSize: 'm',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    marginBottom: 'xl',
                                }}
                            >
                                Welcome back Popol!
                            </Text>

                            <View sx={{ marginBottom: 'xl' }}>
                                <Text
                                    sx={{
                                        color: 'greyLighter',
                                        fontSize: 'xs',
                                        fontWeight: 'bold',
                                        textAlign: 'left',
                                        marginBottom: 'm',
                                    }}
                                >
                                    Nickname
                                </Text>

                                <TextField
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Email"
                                    placeholderTextColor="#fff"
                                    sx={{
                                        borderWidth: 1,
                                        borderColor: 'greyLighter',
                                    }}
                                />
                            </View>

                            <View sx={{ marginBottom: 'xl' }}>
                                <Text
                                    sx={{
                                        color: 'greyLighter',
                                        fontSize: 'xs',
                                        fontWeight: 'bold',
                                        textAlign: 'left',
                                        marginBottom: 'm',
                                    }}
                                >
                                    Nickname
                                </Text>

                                <TextField
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Password"
                                    placeholderTextColor="#fff"
                                    sx={{
                                        borderWidth: 1,
                                        borderColor: 'greyLighter',
                                    }}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSigningInSubmit}
                                style={sx({
                                    paddingX: 's',
                                    paddingY: 'm',
                                    backgroundColor: 'greyLighter',
                                    borderRadius: 's',
                                })}
                            >
                                <Text
                                    sx={{
                                        color: 'greyLight',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Log in
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </AppScreen>
    );
};

export default SigningInScreen;
