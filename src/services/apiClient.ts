import type { PostgrestError } from '@supabase/supabase-js';

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

const ERROR_MESSAGE_MAP: Record<string, string> = {
  '23505': '数据已存在，请勿重复提交。',
  '23503': '关联数据不存在或已被删除，请刷新后重试。',
  '42501': '您暂无此操作权限。',
};

export function mapApiError(error: unknown, fallbackMessage: string): BusinessError {
  if (error instanceof BusinessError) return error;

  const maybePostgrestError = error as PostgrestError | null;
  const code = maybePostgrestError?.code || '';

  if (code && ERROR_MESSAGE_MAP[code]) {
    return new BusinessError(ERROR_MESSAGE_MAP[code]);
  }

  return new BusinessError(fallbackMessage);
}

