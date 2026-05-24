import { Controller, Delete, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a user and its professional profile' })
  @ApiResponse({ status: 200, description: 'User soft-deleted successfully' })
  softDeleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.softDeleteUser(id);
  }
}
