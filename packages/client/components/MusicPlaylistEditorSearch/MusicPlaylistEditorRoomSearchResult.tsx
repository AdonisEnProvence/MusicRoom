import { MpeRoomSummary } from '@musicroom/types';
import { useSx, View } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import React from 'react';
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import { Typo } from '../kit';

interface MusicPlaylistEditorRoomSearchResultProps {
    roomSummary: MpeRoomSummary;
    onPress: (roomSummary: MpeRoomSummary) => void;
}

export const MusicPlaylistEditorRoomSearchResult: React.FC<MusicPlaylistEditorRoomSearchResultProps> =
    ({ roomSummary, onPress }) => {
        const { roomID, roomName, creatorName, isInvited, isOpen } =
            roomSummary;
        const sx = useSx();

        return (
            <View
                sx={{
                    marginBottom: 'm',
                }}
            >
                <TouchableOpacity
                    testID={`mpe-room-card-${roomID}`}
                    onPress={() => {
                        onPress(roomSummary);
                    }}
                >
                    <View
                        sx={{
                            flexDirection: 'row',
                            flexShrink: 0,
                            justifyContent: 'space-between',
                        }}
                    >
                        <View
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                flexShrink: 1,
                            }}
                        >
                            <View
                                sx={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <Typo
                                    numberOfLines={1}
                                    sx={{
                                        fontSize: 's',
                                        flexShrink: 1,
                                    }}
                                >
                                    {roomName}
                                </Typo>
                                <View
                                    sx={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    {isOpen === true ? (
                                        <>
                                            {isInvited && (
                                                <FontAwesome
                                                    name="envelope"
                                                    style={sx({
                                                        color: 'greyLighter',
                                                        fontSize: 'm',
                                                        paddingLeft: 'm',
                                                    })}
                                                    accessibilityLabel={`You're invited to ${roomName}`}
                                                />
                                            )}
                                            <Entypo
                                                name="globe"
                                                style={sx({
                                                    color: 'greyLighter',
                                                    fontSize: 'm',
                                                    paddingLeft: 'm',
                                                })}
                                                accessibilityLabel={`${roomName} is a public playlist`}
                                            />
                                        </>
                                    ) : (
                                        <Entypo
                                            name="lock"
                                            style={sx({
                                                color: 'greyLighter',
                                                fontSize: 'm',
                                                paddingLeft: 'm',
                                            })}
                                            accessibilityLabel={`${roomName} is a private playlist where you've been invited`}
                                        />
                                    )}
                                </View>
                            </View>

                            <Typo
                                numberOfLines={1}
                                sx={{
                                    fontSize: 'xs',
                                    color: 'greyLighter',
                                }}
                            >
                                {creatorName}
                            </Typo>
                        </View>
                        <View
                            sx={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flexShrink: 0,
                                paddingLeft: 'm',
                            }}
                        >
                            <Ionicons
                                name="chevron-forward"
                                style={sx({
                                    color: 'greyLighter',
                                    fontSize: 'm',
                                })}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };
