import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export function getConstantAppVersionWrapper(): string | undefined {
    return Constants.manifest.version;
}

export function getDeviceNameWrapper(): string | undefined {
    return Device.deviceName ?? undefined;
}

export function getPlatformOsWrapper(): string {
    return Platform.OS;
}
