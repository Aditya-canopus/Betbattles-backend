import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getUsers() {
    return this.prisma.user.findMany();
  }

  async getFriends(userId: number) {
    const friends = await this.prisma.friend.findMany({
      where: {
        OR: [
          { user_id: userId },
          { friend_id: userId },
        ],
      },
      include: {
        user: { select: { id: true, username: true, avatar_id: true } },
        friend: { select: { id: true, username: true, avatar_id: true } },
      },
    });

    return friends.map(friend => ({
      id: friend.user_id === userId ? friend.friend_id : friend.user_id,
      username: friend.user_id === userId ? friend.friend.username : friend.user.username,
      avatar_id: friend.user_id === userId ? friend.friend.avatar_id : friend.user.avatar_id,
      status: 'online', // Simplified; add logic for online/offline status
    }));
  }


}