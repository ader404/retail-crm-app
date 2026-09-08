import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: Date;
  entityType?: string;
  entityId?: string;
  targetRoute?: string;
}

@Injectable()
export class NotificationsService {
  private notifications: Notification[] = [];

  add(type: string, message: string, meta?: { entityType?: string; entityId?: string; targetRoute?: string }) {
    this.notifications.unshift({
      id: randomUUID(),
      type,
      message,
      read: false,
      createdAt: new Date(),
      ...meta,
    });
    if (this.notifications.length > 100) this.notifications.pop();
  }

  findAll() {
    return this.notifications;
  }

  markRead(id: string) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) notification.read = true;
    return notification;
  }

  markAllRead() {
    this.notifications.forEach((n) => (n.read = true));
    return this.notifications;
  }
}
