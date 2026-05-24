export const SOFT_DELETE_FILTER = { deletedAt: null };

export function withoutDeleted(where?: any): any {
  if (!where) {
    return { ...SOFT_DELETE_FILTER };
  }

  return {
    ...where,
    ...SOFT_DELETE_FILTER,
  };
}
