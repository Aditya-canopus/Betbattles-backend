import { Controller, Get, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { JwtPayload } from 'src/auth/types/jwt-payload.interface';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getUsers() {
    return this.userService.getUsers();
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getUserById(id);
  }

  @Get('friends')
  @UseGuards(JwtAuthGuard)
  async getFriends(@Request() req: { user: JwtPayload }) {
    const userId = req.user.sub;
    return this.userService.getFriends(userId);
  }

}