import { AuditCategory, AuditOutcome } from '@prisma/client';
import { AuditLogChange } from '../../../shared/audit/auditSanitizer';

export interface AuditActor {
  id: string;
  displayName: string;
}

export interface AuditListItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  category: AuditCategory | null;
  outcome: AuditOutcome | null;
  action: string;
  entityType: string;
  affectedObjectName: string | null;
  authFailureCount: number | null;
  resolvedAt: Date | null;
  actor: AuditActor | null;
}

export interface AuditListResponse {
  items: AuditListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AuditSearchListItem extends AuditListItem {
  matchType?: 'exact_id' | 'fulltext';
}

export interface AuditSearchResponse {
  items: AuditSearchListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AuditDetailResponse {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  category: AuditCategory | null;
  outcome: AuditOutcome | null;
  action: string;
  entityType: string;
  entityId: string;
  affectedObjectName: string | null;
  authFailureCount: number | null;
  resolvedAt: Date | null;
  actor: AuditActor | null;
  additionalAffectedObjects: unknown | null;
  changes: AuditLogChange[] | unknown | null;
  details: Record<string, unknown> | null;
  triggeredBy: AuditActor | null;
}

export interface AuditFilterOptionsResponse {
  actions: string[];
  entityTypes: string[];
  actors: AuditActor[];
  hasSystemEvents: boolean;
  outcomes: AuditOutcome[];
}

export interface AuditLogQueryFilters {
  page?: number;
  pageSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  actorId?: string; // a user id or 'system' (actorId IS NULL)
  action?: string;
  entityType?: string;
  entityId?: string;
  outcome?: AuditOutcome | 'UNCLASSIFIED';
}
