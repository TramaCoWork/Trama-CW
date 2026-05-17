import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { DeleteMessageDto } from './dto/delete-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  sendMessage(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.sendMessage(user.userId, dto);
  }

  @Get('conversations')
  getConversations(
    @CurrentUser() user: CurrentUserType,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagesService.getConversations(user.userId, query.cursor, query.take);
  }

  @Get('conversations/:userId')
  getMessages(
    @CurrentUser() user: CurrentUserType,
    @Param('userId') otherUserId: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagesService.getMessages(user.userId, otherUserId, query.cursor, query.take);
  }

  @Get('recipients')
  @ApiQuery({ name: 'q', required: true, type: String })
  searchRecipients(
    @CurrentUser() user: CurrentUserType,
    @Query('q') term: string,
  ) {
    return this.messagesService.searchRecipients(user.userId, term ?? '');
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser() user: CurrentUserType,
    @Param('id') messageId: string,
  ) {
    return this.messagesService.markAsRead(user.userId, messageId);
  }

  @Delete('conversations/:userId')
  deleteConversation(
    @CurrentUser() user: CurrentUserType,
    @Param('userId') otherUserId: string,
  ) {
    return this.messagesService.deleteConversation(user.userId, otherUserId);
  }

  @Delete(':id')
  deleteMessage(
    @CurrentUser() user: CurrentUserType,
    @Param('id') messageId: string,
    @Query() dto: DeleteMessageDto,
  ) {
    return this.messagesService.deleteMessage(user.userId, messageId, dto.forAll);
  }
}
