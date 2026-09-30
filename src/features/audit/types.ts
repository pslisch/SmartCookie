/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AuditCategory =
  | 'AUTHENTICATION_SECURITY'
  | 'PERMISSIONS_ORGANIZATION'
  | 'LEARNING_CONTENT_ASSIGNMENTS'
  | 'LEARNING_RESULTS'
  | 'DELETION'
  | 'FAILURES';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'RESOLVED';

export interface AuditActor {
  id: string;
  displayName: string;
}

export interface AdditionalAffectedObject {
  type: string;
  id: string;
  name: string;
}

export interface AuditLogChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface AuditListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  category: AuditCategory | null;
  outcome: AuditOutcome | null;
  action: string;
  entityType: string;
  affectedObjectName: string | null;
  authFailureCount: number | null;
  resolvedAt: string | null;
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
  createdAt: string;
  updatedAt: string;
  category: AuditCategory | null;
  outcome: AuditOutcome | null;
  action: string;
  entityType: string;
  entityId: string;
  affectedObjectName: string | null;
  authFailureCount: number | null;
  resolvedAt: string | null;
  actor: AuditActor | null;
  additionalAffectedObjects: AdditionalAffectedObject[] | null;
  changes: AuditLogChange[] | null;
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

export interface AuditFilterState {
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  actorId: string;
  action: string;
  entityType: string;
  outcome: string; // 'SUCCESS' | 'FAILURE' | 'RESOLVED' | 'UNCLASSIFIED' | ''
}
