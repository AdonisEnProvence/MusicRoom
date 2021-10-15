import { MachineOptions } from 'xstate';
import { AppUserMachineContext, AppUserMachineEvent } from '../appUserMachine';

export type AppUserMachineOptions = Partial<
    MachineOptions<AppUserMachineContext, AppUserMachineEvent>
>;

export function getUserMachineOptions(): AppUserMachineOptions {
    return {};
}
