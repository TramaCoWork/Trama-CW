import { validate } from 'class-validator';
import { CreateMessageDto } from './create-message.dto';
import { QueryMessagesDto } from './query-messages.dto';

describe('Messages DTOs', () => {
  it('CreateMessageDto rechaza content vacío', async () => {
    const dto = new CreateMessageDto();
    dto.receiverId = '550e8400-e29b-41d4-a716-446655440000';
    dto.content = '';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'content')).toBe(true);
  });

  it('CreateMessageDto rechaza content > 5000 chars', async () => {
    const dto = new CreateMessageDto();
    dto.receiverId = '550e8400-e29b-41d4-a716-446655440000';
    dto.content = 'a'.repeat(5001);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'content')).toBe(true);
  });

  it('CreateMessageDto rechaza receiverId no UUID', async () => {
    const dto = new CreateMessageDto();
    dto.receiverId = 'not-uuid';
    dto.content = 'hola';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'receiverId')).toBe(true);
  });

  it('QueryMessagesDto tiene take default 20', () => {
    const dto = new QueryMessagesDto();
    expect(dto.take).toBe(20);
  });
});
