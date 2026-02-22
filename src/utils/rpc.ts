export type RpcEnvelope<T = Record<string, unknown>> = {
  ok: boolean;
  code?: string | null;
  message?: string | null;
} & T;

export function parseRpcEnvelope<T extends RpcEnvelope>(raw: unknown, fallback: string): T {
  const payload = (Array.isArray(raw) ? raw[0] : raw) as T | undefined;
  if (!payload || typeof payload !== 'object') {
    throw new Error(fallback);
  }
  if (payload.ok === false) {
    const code = payload.code ? `[${payload.code}] ` : '';
    throw new Error(`${code}${payload.message || fallback}`);
  }
  return payload;
}
