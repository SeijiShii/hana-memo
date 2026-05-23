/**
 * _shared/db barrel export
 * 関連: docs/_shared/db/001_db_SPEC.md
 */
export * from './schema';
export { db, dbPool } from './client';
export type { Db } from './client';
export { withUserScope, assertOwner, AuthorizationError } from './access';
export type { UserScope } from './access';
export { DbError, isUniqueViolation, isCheckViolation } from './errors';
