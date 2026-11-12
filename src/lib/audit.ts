// ============================================================================
// SECOND LIFE — Audit Trail Logger & Event Notification Dispatcher
// ============================================================================

import crypto from 'node:crypto';
import { getDb, isDemoMode } from './db.ts';

export interface AuditLogInput {
  actorUserId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId: string;
  previousState?: string | null;
  newState?: string | null;
  reason?: string | null;
  isDemo?: number;
}

export function recordAuditLog(input: AuditLogInput): string {
  const db = getDb();
  const id = 'aud-' + crypto.randomUUID().slice(0, 12);
  const isDemo = input.isDemo !== undefined ? input.isDemo : (isDemoMode() ? 1 : 0);

  db.prepare(
    `INSERT INTO audit_logs (
       id, actor_user_id, actor_name, actor_role, action,
       target_entity, target_id, previous_state, new_state, reason, is_demo
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.actorUserId,
    input.actorName,
    input.actorRole,
    input.action,
    input.targetEntity,
    input.targetId,
    input.previousState ?? null,
    input.newState ?? null,
    input.reason ?? null,
    isDemo
  );

  return id;
}

export interface NotificationInput {
  userId: string;
  eventType: string;
  title: string;
  message: string;
  linkUrl: string;
  isDemo?: number;
}

export function createNotification(input: NotificationInput): string {
  const db = getDb();
  const id = 'ntf-' + crypto.randomUUID().slice(0, 12);
  const isDemo = input.isDemo !== undefined ? input.isDemo : (isDemoMode() ? 1 : 0);

  db.prepare(
    `INSERT INTO notifications (
       id, user_id, event_type, title, message, link_url, is_read, is_demo
     ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    input.userId,
    input.eventType,
    input.title,
    input.message,
    input.linkUrl,
    isDemo
  );

  return id;
}
