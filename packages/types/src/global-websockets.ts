export interface GlobalClientToServerEvents {
    GET_HAS_ACKNOWLEDGED_CONNECTION: (onAcknowledged: () => void) => void;
}
