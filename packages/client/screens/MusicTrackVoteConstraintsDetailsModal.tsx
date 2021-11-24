import { Skeleton } from '@motify/skeleton';
import { MtvRoomGetRoomConstraintDetailsCallbackArgs } from '@musicroom/types';
import { Text, View } from 'dripsy';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { useMusicPlayerContext } from '../hooks/musicPlayerHooks';
import { MusicTrackVoteChatModalProps } from '../types';

interface RoomConstraintsDetailsPreviewProps {
    constraintsDetails: MtvRoomGetRoomConstraintDetailsCallbackArgs;
    roomName: string;
}

const RoomConstraintsDetailsPreview: React.FC<RoomConstraintsDetailsPreviewProps> =
    ({
        constraintsDetails: {
            physicalConstraintStartsAt,
            physicalConstraintEndsAt,
            physicalConstraintPosition,
            physicalConstraintRadius,
            roomID,
        },
        roomName,
    }) => {
        const insets = useSafeAreaInsets();

        return <View />;
    };

const MusicTrackVoteConstraintsDetailsModal: React.FC<MusicTrackVoteChatModalProps> =
    ({ navigation }) => {
        const insets = useSafeAreaInsets();
        const { musicPlayerState, sendToMusicPlayerMachine } =
            useMusicPlayerContext();
        const {
            hasTimeAndPositionConstraints,
            roomID,
            constraintsDetails,
            name: roomName,
        } = musicPlayerState.context;

        const displayLoader = constraintsDetails === undefined;
        const noCurrentRoom = roomID === '';
        const noCurrentRoomOrRoomDoesnotHaveConstraints =
            !hasTimeAndPositionConstraints || noCurrentRoom;

        useEffect(() => {
            if (noCurrentRoomOrRoomDoesnotHaveConstraints) {
                return;
            }

            if (constraintsDetails === undefined) {
                sendToMusicPlayerMachine({
                    type: 'GET_ROOM_CONSTRAINTS_DETAILS',
                });
            }
        }, [
            constraintsDetails,
            noCurrentRoomOrRoomDoesnotHaveConstraints,
            sendToMusicPlayerMachine,
        ]);

        if (noCurrentRoomOrRoomDoesnotHaveConstraints) {
            return (
                <AppScreen>
                    <AppScreenHeader
                        title="Music Track Vote Constraints"
                        insetTop={insets.top}
                        canGoBack={true}
                        goBack={() => {
                            navigation.goBack();
                        }}
                    />

                    <AppScreenContainer>
                        <Text>
                            You're room is not concerned about any constraints
                        </Text>
                    </AppScreenContainer>
                </AppScreen>
            );
        }

        return (
            <AppScreen>
                <AppScreenHeader
                    title="userName profile"
                    insetTop={insets.top}
                    canGoBack={true}
                    goBack={() => {
                        navigation.goBack();
                    }}
                />

                <AppScreenContainer>
                    <Skeleton
                        show={displayLoader}
                        colorMode="dark"
                        width="100%"
                    >
                        {constraintsDetails !== undefined ? (
                            <RoomConstraintsDetailsPreview
                                constraintsDetails={constraintsDetails}
                                roomName={roomName}
                            />
                        ) : undefined}
                    </Skeleton>
                </AppScreenContainer>
            </AppScreen>
        );
    };

export default MusicTrackVoteConstraintsDetailsModal;
