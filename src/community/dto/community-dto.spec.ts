import { validate } from 'class-validator';
import { CreatePostDto } from './create-post.dto';
import { CreateCommentDto } from './create-comment.dto';

describe('Community DTOs', () => {
  it('CreatePostDto accepts content with 5000 chars', async () => {
    const dto = new CreatePostDto();
    dto.content = 'a'.repeat(5000);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('CreatePostDto rejects content with 5001 chars', async () => {
    const dto = new CreatePostDto();
    dto.content = 'a'.repeat(5001);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'content')).toBe(true);
  });

  it('CreateCommentDto accepts content with 2000 chars', async () => {
    const dto = new CreateCommentDto();
    dto.postId = '550e8400-e29b-41d4-a716-446655440000';
    dto.content = 'a'.repeat(2000);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('CreateCommentDto rejects content with 2001 chars', async () => {
    const dto = new CreateCommentDto();
    dto.postId = '550e8400-e29b-41d4-a716-446655440000';
    dto.content = 'a'.repeat(2001);

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'content')).toBe(true);
  });

  it('both DTOs reject empty content', async () => {
    const postDto = new CreatePostDto();
    postDto.content = '';

    const commentDto = new CreateCommentDto();
    commentDto.postId = '550e8400-e29b-41d4-a716-446655440000';
    commentDto.content = '';

    const postErrors = await validate(postDto);
    const commentErrors = await validate(commentDto);

    expect(postErrors.some((error) => error.property === 'content')).toBe(true);
    expect(commentErrors.some((error) => error.property === 'content')).toBe(
      true,
    );
  });
});
