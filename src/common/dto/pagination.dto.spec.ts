import { validate } from 'class-validator';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  it('uses defaults for page and limit', async () => {
    const dto = new PaginationDto();

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('rejects non-numeric page', async () => {
    const dto = new PaginationDto();
    (dto as unknown as { page: unknown }).page = 'abc';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it('rejects non-numeric limit', async () => {
    const dto = new PaginationDto();
    (dto as unknown as { limit: unknown }).limit = 'abc';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects page and limit lower than 1', async () => {
    const dto = new PaginationDto();
    dto.page = 0;
    dto.limit = 0;

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'page')).toBe(true);
    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });
});
