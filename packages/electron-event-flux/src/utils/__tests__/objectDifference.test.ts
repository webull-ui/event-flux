import objectDifference from '../objectDifference';

test('base diff', () => {
  let sameObj = { hello: 'a' };
  let oldObj = { d: 'b', same: sameObj };
  let newObj = { m: 'b', same: sameObj };
  let retObj = objectDifference(oldObj, newObj);
  expect(retObj).toEqual({
    updated: { m: 'b' },
    deleted: { d: true },
  });
});

test('benchmark', () => {
  
})