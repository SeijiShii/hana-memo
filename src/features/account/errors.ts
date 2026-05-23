/**
 * account 例外型
 * 関連: docs/account/001_account_SPEC.md §4, 003_account_UNIT_TEST.md
 */

export class AccountError extends Error {
  constructor(public readonly reason: string) {
    super(`Account: ${reason}`);
    this.name = 'AccountError';
  }
}

/** 既に削除予約済みの user に再度削除予約 (E-AC-003 / UT-AC-A03) */
export class AlreadyDeletedError extends AccountError {
  constructor() {
    super('already scheduled for deletion');
    this.name = 'AlreadyDeletedError';
  }
}

/** 削除予約していない user に取消 (UT-AC-A05) */
export class NotPendingDeletionError extends AccountError {
  constructor() {
    super('no pending deletion to cancel');
    this.name = 'NotPendingDeletionError';
  }
}
