// ============================================================================
// SECOND LIFE — Audit Trail Logger & Event Notification Dispatcher
// ============================================================================

import crypto from 'node:crypto';
import { getDb, isDemoMode } from './db.js';

                                
                             
                    
                    
                 
                       
                   
                                
                           
                         
                  
 

export function recordAuditLog(input               )         {
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

                                    
                 
                    
                
                  
                  
                  
 

export function createNotification(input                   )         {
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
