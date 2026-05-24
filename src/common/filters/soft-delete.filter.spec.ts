import { SOFT_DELETE_FILTER, withoutDeleted } from './soft-delete.filter';

describe('soft-delete.filter', () => {
  it('returns deletedAt null when where is missing', () => {
    expect(withoutDeleted()).toEqual(SOFT_DELETE_FILTER);
  });

  it('merges deletedAt null into existing where', () => {
    expect(withoutDeleted({ id: 'user-id' })).toEqual({
      id: 'user-id',
      deletedAt: null,
    });
  });
});
