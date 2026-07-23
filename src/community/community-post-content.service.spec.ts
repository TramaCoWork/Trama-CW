import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunityService } from './community.service';

describe('CommunityService.updatePostContent', () => {
  const prisma = {
    communityPost: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: CommunityService;

  const ownerRoles = [{ name: 'professional', type: 'professional' }];
  const adminRoles = [{ name: 'admin', type: 'admin' }];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityService(prisma as any);
  });

  it('el owner edita el contenido (sanitizado)', async () => {
    prisma.communityPost.findUnique.mockResolvedValue({
      id: 'post-1',
      userId: 'owner-1',
      deletedAt: null,
    });
    prisma.communityPost.update.mockResolvedValue({ id: 'post-1' });

    await service.updatePostContent(
      'owner-1',
      ownerRoles,
      'post-1',
      'nuevo contenido',
    );

    expect(prisma.communityPost.update).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { content: 'nuevo contenido' },
    });
  });

  it('sanitiza HTML del contenido editado', async () => {
    prisma.communityPost.findUnique.mockResolvedValue({
      id: 'post-1',
      userId: 'owner-1',
      deletedAt: null,
    });
    prisma.communityPost.update.mockResolvedValue({ id: 'post-1' });

    await service.updatePostContent(
      'owner-1',
      ownerRoles,
      'post-1',
      'hola <script>alert(1)</script> mundo',
    );

    const arg = prisma.communityPost.update.mock.calls[0][0];
    expect(arg.data.content).not.toContain('<script>');
  });

  it('un admin puede editar un post ajeno', async () => {
    prisma.communityPost.findUnique.mockResolvedValue({
      id: 'post-1',
      userId: 'owner-1',
      deletedAt: null,
    });
    prisma.communityPost.update.mockResolvedValue({ id: 'post-1' });

    await service.updatePostContent(
      'admin-user',
      adminRoles,
      'post-1',
      'editado por admin',
    );

    expect(prisma.communityPost.update).toHaveBeenCalled();
  });

  it('403 si no es owner ni admin', async () => {
    prisma.communityPost.findUnique.mockResolvedValue({
      id: 'post-1',
      userId: 'owner-1',
      deletedAt: null,
    });

    await expect(
      service.updatePostContent('otro', ownerRoles, 'post-1', 'x'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.communityPost.update).not.toHaveBeenCalled();
  });

  it('404 si el post no existe o esta borrado', async () => {
    prisma.communityPost.findUnique.mockResolvedValue(null);
    await expect(
      service.updatePostContent('owner-1', ownerRoles, 'post-x', 'x'),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.communityPost.findUnique.mockResolvedValue({
      id: 'post-1',
      userId: 'owner-1',
      deletedAt: new Date(),
    });
    await expect(
      service.updatePostContent('owner-1', ownerRoles, 'post-1', 'x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
