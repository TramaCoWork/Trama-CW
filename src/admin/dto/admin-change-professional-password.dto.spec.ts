import { validate } from 'class-validator';
import { AdminChangeProfessionalPasswordDto } from './admin-change-professional-password.dto';

describe('AdminChangeProfessionalPasswordDto', () => {
  it('accepts matching passwords with minimum length', async () => {
    const dto = new AdminChangeProfessionalPasswordDto();
    dto.password = 'newPassword123';
    dto.confirmPassword = 'newPassword123';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects when confirmPassword does not match password', async () => {
    const dto = new AdminChangeProfessionalPasswordDto();
    dto.password = 'newPassword123';
    dto.confirmPassword = 'differentPassword123';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'confirmPassword')).toBe(
      true,
    );
  });

  it('rejects password shorter than 8 characters', async () => {
    const dto = new AdminChangeProfessionalPasswordDto();
    dto.password = 'short';
    dto.confirmPassword = 'short';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects when password and confirmPassword are missing', async () => {
    const dto = new AdminChangeProfessionalPasswordDto();

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});
