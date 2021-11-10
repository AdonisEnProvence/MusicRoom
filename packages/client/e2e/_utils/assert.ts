export function assertIsNotUndefined<ValueType>(
    value: ValueType | undefined,
    label?: string,
): asserts value is ValueType {
    if (value === undefined) {
        throw new Error(label ?? 'value must not be undefined');
    }
}

export function assertIsNotNull<ValueType>(
    value: ValueType | null,
    label?: string,
): asserts value is ValueType {
    if (value === undefined) {
        throw new Error(label ?? 'value must not be null');
    }
}
