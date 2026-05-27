/**
 * flow.ts 単体テスト (capture pipeline orchestration)
 * 由来: 003_capture_UNIT_TEST.md §1.3 (CF01〜CF03)
 */
import { describe, it, expect, vi } from 'vitest';
import { runCapturePipeline, type CaptureDeps, type CapturePipelineInput } from './flow';
import { AiConsentRequiredError } from './errors';
import { QuotaExceededError } from '../../shared/ai';
import { UploadFailedError } from '../../shared/storage';

const input: CapturePipelineInput = {
  userId: 'user_1',
  capturedAt: '2026-05-23T00:00:00Z',
  season: 'spring',
  userNote: 'white flower',
};

function makeDeps(over: Partial<CaptureDeps> = {}): {
  deps: CaptureDeps;
  calls: string[];
  spies: Record<string, ReturnType<typeof vi.fn>>;
} {
  const calls: string[] = [];
  const track = (name: string, fn: (...a: never[]) => unknown) =>
    vi.fn((...a: never[]) => {
      calls.push(name);
      return fn(...a);
    });
  const spies = {
    createDiscovery: track('createDiscovery', () => Promise.resolve('disc_1')),
    uploadImage: track('uploadImage', () => Promise.resolve({ objectKey: 'user_1/disc_1/i.webp' })),
    attachImage: track('attachImage', () => Promise.resolve()),
    triggerIdentify: track('triggerIdentify', () => Promise.resolve()),
    deleteDiscovery: track('deleteDiscovery', () => Promise.resolve()),
  };
  const deps: CaptureDeps = {
    isAiConsentActive: () => true,
    checkQuota: () => Promise.resolve(true),
    createDiscovery: spies.createDiscovery as never,
    uploadImage: spies.uploadImage as never,
    attachImage: spies.attachImage as never,
    triggerIdentify: spies.triggerIdentify as never,
    deleteDiscovery: spies.deleteDiscovery as never,
    ...over,
  };
  return { deps, calls, spies };
}

describe('runCapturePipeline', () => {
  it('UT-CA-CF01: 正常 flow → createDiscovery→upload→attach→identify の順', async () => {
    const { deps, calls } = makeDeps();
    const res = await runCapturePipeline(deps, input);
    expect(res.discoveryId).toBe('disc_1');
    expect(calls).toEqual(['createDiscovery', 'uploadImage', 'attachImage', 'triggerIdentify']);
  });

  it('O45: onStage を uploading→identifying の順で通知する (進捗 UX)', async () => {
    const stages: string[] = [];
    const { deps } = makeDeps({ onStage: (s) => stages.push(s) });
    await runCapturePipeline(deps, input);
    expect(stages).toEqual(['uploading', 'identifying']);
  });

  it('AI 同意 OFF → AiConsentRequiredError (discovery 作成しない)', async () => {
    const { deps, spies } = makeDeps({ isAiConsentActive: () => false });
    await expect(runCapturePipeline(deps, input)).rejects.toThrow(AiConsentRequiredError);
    expect(spies.createDiscovery).not.toHaveBeenCalled();
  });

  it('UT-CA-CF02: quota 0 → QuotaExceededError (discovery 作成前)', async () => {
    const { deps, spies } = makeDeps({ checkQuota: () => Promise.resolve(false) });
    await expect(runCapturePipeline(deps, input)).rejects.toThrow(QuotaExceededError);
    expect(spies.createDiscovery).not.toHaveBeenCalled();
  });

  it('UT-CA-CF03: upload 失敗 → discovery 削除 + UploadFailedError', async () => {
    const { deps, spies } = makeDeps({
      uploadImage: vi.fn(() => Promise.reject(new Error('r2 down'))) as never,
    });
    await expect(runCapturePipeline(deps, input)).rejects.toThrow(UploadFailedError);
    expect(spies.deleteDiscovery).toHaveBeenCalledWith('disc_1');
    expect(spies.attachImage).not.toHaveBeenCalled();
    expect(spies.triggerIdentify).not.toHaveBeenCalled();
  });
});
