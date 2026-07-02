import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;
  const prisma = {
    privateMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    professionalProfile: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagesService(prisma as any);
  });

  it('envía mensaje con contenido sanitizado', async () => {
    prisma.privateMessage.create.mockResolvedValue({ id: 'm1' });

    await service.sendMessage('sender-1', {
      receiverId: 'receiver-1',
      content: '<script>alert(1)</script>hola',
    });

    expect(prisma.privateMessage.create).toHaveBeenCalledWith({
      data: {
        senderId: 'sender-1',
        receiverId: 'receiver-1',
        content: 'hola',
      },
    });
  });

  it('lanza error al enviarse mensaje a sí mismo', async () => {
    await expect(
      service.sendMessage('user-1', {
        receiverId: 'user-1',
        content: 'hola',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista conversaciones filtrando soft delete por lado correcto', async () => {
    prisma.privateMessage.findMany.mockResolvedValue([]);

    await service.getConversations('user-1', undefined, 20);

    expect(prisma.privateMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { senderId: 'user-1', deletedBySender: false },
            { receiverId: 'user-1', deletedByReceiver: false },
          ],
        },
      }),
    );
  });

  it('markAsRead solo funciona si el usuario es receiver', async () => {
    prisma.privateMessage.findUnique.mockResolvedValue({
      id: 'm1',
      senderId: 'sender-1',
      receiverId: 'receiver-1',
      readAt: null,
    });

    await expect(service.markAsRead('other-user', 'm1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('soft delete setea deletedBySender cuando elimina el sender', async () => {
    prisma.privateMessage.findUnique.mockResolvedValue({
      id: 'm1',
      senderId: 'sender-1',
      receiverId: 'receiver-1',
    });
    prisma.privateMessage.update.mockResolvedValue({ id: 'm1' });

    await service.deleteMessage('sender-1', 'm1');

    expect(prisma.privateMessage.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { deletedBySender: true },
    });
  });

  it('soft delete setea deletedByReceiver cuando elimina el receiver', async () => {
    prisma.privateMessage.findUnique.mockResolvedValue({
      id: 'm1',
      senderId: 'sender-1',
      receiverId: 'receiver-1',
    });
    prisma.privateMessage.update.mockResolvedValue({ id: 'm1' });

    await service.deleteMessage('receiver-1', 'm1');

    expect(prisma.privateMessage.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { deletedByReceiver: true },
    });
  });
});
