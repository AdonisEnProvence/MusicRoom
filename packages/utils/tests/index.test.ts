import getSum from '../src/index';
import { ResponseToUniverse } from '@musicroom/types';

test('it returns the sum of 1 and 1', () => {
    const computedResult = getSum(1, 1);
    const expectedResult = 2;

    expect(computedResult).toBe(expectedResult);
});

test('it should return responseToUniverse + responseToUniverse', () => {
    const expectedResult = ResponseToUniverse * 2;
    const computedResult = getSum(ResponseToUniverse, ResponseToUniverse);

    expect(computedResult).toBe(expectedResult);
});
