import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseEnumPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReactionTargetType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { ReactionsService } from './reactions.service';
import { SetReactionDto } from './dto/set-reaction.dto';

const targetTypePipe = new ParseEnumPipe(ReactionTargetType, {
  exceptionFactory: () => new BadRequestException('Tipo de contenido no válido.'),
});

@ApiTags('Reactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Put(':targetType/:targetId')
  @ApiOperation({ summary: 'Fijar o reemplazar mi reacción sobre un post/comentario' })
  @ApiResponse({ status: 200, description: 'Reacciones actualizadas del target' })
  @ApiResponse({ status: 404, description: 'No se encontró el contenido' })
  setReaction(
    @CurrentUser() user: CurrentUserType,
    @Param('targetType', targetTypePipe) targetType: ReactionTargetType,
    @Param('targetId') targetId: string,
    @Body() dto: SetReactionDto,
  ) {
    return this.reactionsService.setReaction(targetType, targetId, dto.type, user);
  }

  @Delete(':targetType/:targetId')
  @ApiOperation({ summary: 'Quitar mi reacción sobre un post/comentario' })
  @ApiResponse({ status: 200, description: 'Reacciones actualizadas del target' })
  @ApiResponse({ status: 404, description: 'No se encontró el contenido' })
  removeReaction(
    @CurrentUser() user: CurrentUserType,
    @Param('targetType', targetTypePipe) targetType: ReactionTargetType,
    @Param('targetId') targetId: string,
  ) {
    return this.reactionsService.removeReaction(targetType, targetId, user);
  }
}
