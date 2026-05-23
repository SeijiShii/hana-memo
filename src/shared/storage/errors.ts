/**
 * ストレージ例外型
 * 関連: docs/_shared/storage/001_storage_SPEC.md §4.2, 002_storage_PLAN.md §1.1
 */

/** contentType / サイズ違反 (E-ST-002) */
export class InvalidImageError extends Error {
  constructor(public readonly reason: string) {
    super(`InvalidImage: ${reason}`);
    this.name = 'InvalidImageError';
  }
}

/** upload リトライ尽きた (E-ST-001) */
export class UploadFailedError extends Error {
  constructor(
    message = 'upload failed after retries',
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UploadFailedError';
  }
}

/** objectKey の所有者違反 (E-ST-005、403) */
export class StorageOwnershipError extends Error {
  constructor(public readonly objectKey: string) {
    super(`StorageOwnership: not owner of ${objectKey}`);
    this.name = 'StorageOwnershipError';
  }
}
