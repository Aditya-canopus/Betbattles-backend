import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamBetService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeamBet(userId: number, slotSize: number, betAmount: number) {
    if (slotSize < 2 || slotSize > 4) {
      throw new BadRequestException('Slot size must be between 2 and 4.');
    }
    if (betAmount <= 0) {
      throw new BadRequestException('Bet amount must be greater than 0.');
    }

    const teamBet = await this.prisma.teamBet.create({
      data: {
        host_id: userId,
        slot_size: slotSize,
        bet_amount: betAmount,
        status: 'pending',
      },
    });

    // Initialize slots: Team 1 (host) and Team 2
    const slots = [];
    for (let team = 1; team <= 2; team++) {
      for (let slot = 1; slot <= slotSize; slot++) {
        slots.push({
          team_bet_id: teamBet.id,
          team_number: team,
          slot_number: slot,
          status: team === 1 && slot === 1 ? 'filled' : 'open',
          user_id: team === 1 && slot === 1 ? userId : null,
        });
      }
    }

    await this.prisma.teamSlot.createMany({ data: slots });

    return { message: 'Team bet created successfully.', teamBetId: teamBet.id };
  }

  async invitePlayers(teamBetId: number, userId: number, invitees: { type: 'friend' | 'random'; userId?: number }[]) {
    const teamBet = await this.prisma.teamBet.findUnique({
      where: { id: teamBetId, host_id: userId },
      include: { teamSlots: true },
    });
    if (!teamBet) {
      throw new BadRequestException('Team bet not found or you are not the host.');
    }
  
    const openSlots = teamBet.teamSlots.filter(slot => slot.status === 'open');
    if (openSlots.length < invitees.length) {
      throw new BadRequestException('Not enough open slots.');
    }
  
    const notifications = [];
    for (const [index, invitee] of invitees.entries()) {
      let inviteeId: number;
      if (invitee.type === 'friend') {
        if (!invitee.userId) throw new BadRequestException('Friend ID required.');
        inviteeId = invitee.userId;
      } else {
        // Find a random player (e.g., based on matching criteria like bet amount)
        const randomUser = await this.prisma.user.findFirst({
          where: { id: { not: userId } }, // Simplified; add matching logic
        });
        if (!randomUser) throw new BadRequestException('No random players available.');
        inviteeId = randomUser.id;
      }
  
      const slot = openSlots[index];
      await this.prisma.teamSlot.update({
        where: { id: slot.id },
        data: { status: 'invited' },
      });
  
      notifications.push({
        user_id: inviteeId,
        team_bet_id: teamBetId,
        type: 'invite',
        message: `You've been invited to a team bet (${teamBet.bet_amount} USD)!`,
        status: 'unread',
      });
    }
  
    await this.prisma.notification.createMany({ data: notifications });
    return { message: 'Invites sent successfully.' };
  }

  async respondToInvite(userId: number, teamBetId: number, accept: boolean) {
    const notification = await this.prisma.notification.findFirst({
      where: { user_id: userId, team_bet_id: teamBetId, type: 'invite', status: 'unread' },
    });
    if (!notification) {
      throw new BadRequestException('No pending invite found.');
    }
  
    const teamBet = await this.prisma.teamBet.findUnique({
      where: { id: teamBetId },
      include: { teamSlots: true },
    });
    if (!teamBet) {
      throw new BadRequestException('Team bet not found.');
    }
  
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'read' },
    });
  
    if (accept) {
      const openSlot = teamBet.teamSlots.find(slot => slot.status === 'invited');
      if (!openSlot) {
        throw new BadRequestException('No available slot to join.');
      }
  
      await this.prisma.teamSlot.update({
        where: { id: openSlot.id },
        data: { user_id: userId, status: 'filled' },
      });
  
      // Check if all slots are filled
      const filledSlots = teamBet.teamSlots.filter(slot => slot.status === 'filled').length;
      if (filledSlots === teamBet.slot_size * 2) {
        await this.prisma.teamBet.update({
          where: { id: teamBetId },
          data: { status: 'active' },
        });
  
        // Notify all participants
        await this.prisma.notification.createMany({
          data: teamBet.teamSlots.map(slot => ({
            user_id: slot.user_id!,
            team_bet_id: teamBetId,
            type: 'status',
            message: 'Team bet is now active!',
            status: 'unread',
          })),
        });
  
        // Charge players using Stripe (implementation omitted for brevity)
      }
  
      return { message: 'Invite accepted. You have joined the team bet.' };
    } else {
      const invitedSlot = teamBet.teamSlots.find(slot => slot.status === 'invited');
      if (invitedSlot) {
        await this.prisma.teamSlot.update({
          where: { id: invitedSlot.id },
          data: { status: 'open' },
        });
      }
      return { message: 'Invite declined.' };
    }
  }
}