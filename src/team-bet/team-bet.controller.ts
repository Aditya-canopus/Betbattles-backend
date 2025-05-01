import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { TeamBetService } from './team-bet.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { JwtPayload } from '../auth/types/jwt-payload.interface';

@Controller('team-bet')
export class TeamBetController {
  constructor(private readonly teamBetService: TeamBetService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createTeamBet(
    @Request() req: { user: JwtPayload },
    @Body() body: { slotSize: number; betAmount: number }
  ) {
    const userId = req.user.sub;
    return this.teamBetService.createTeamBet(userId, body.slotSize, body.betAmount);
  }
  
  @Post('invite')
  @UseGuards(JwtAuthGuard)  
  async invitePlayers(
      @Request() req: { user: JwtPayload },
      @Body() body: { teamBetId: number; invitees: { type: 'friend' | 'random'; userId?: number }[] }
  ) {
      const userId = req.user.sub;
      return this.teamBetService.invitePlayers(body.teamBetId, userId, body.invitees);
  }

  @Post('invite/respond')
  @UseGuards(JwtAuthGuard)
  async respondToInvite(
    @Request() req: { user: JwtPayload },
    @Body() body: { teamBetId: number; accept: boolean }
  ) {
    const userId = req.user.sub;
    return this.teamBetService.respondToInvite(userId, body.teamBetId, body.accept);
  }
}