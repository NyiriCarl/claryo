// Thin fetch wrapper: timeouts, offline detection and readable errors.
import { config } from '../config';

export type ApiErrorCode =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'rate_limited'
  | 'session_expired'
  | 'auth_required'
  | 'invalid_input'
  | 'ai_unavailable'
  | 'ai_rate_limited'
  | 'ai_refused'
  | 'ai_timeout'
  | 'invalid_ai_output'
  | 'conflict'
  | 'server_error'
  | string;

export class ApiError extends Error {
  constructor(public code: ApiErrorCode, message: string, public status = 0, public body: any = null) {
    super(message);
    this.name = 'ApiError';
  }
}

let sessionToken: string | null = null;
let onExpired: (() => void) | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}
export function onSessionExpired(fn: () => void) {
  onExpired = fn;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ApiError('offline', "You're offline. Check your connection and try again.");
  }
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), opts.timeoutMs ?? 20_000);
  const onAbort = () => timeout.abort();
  opts.signal?.addEventListener('abort', onAbort);

  let res: Response;
  try {
    res = await fetch(config.apiUrl + path, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.anonKey}`,
        apikey: config.anonKey,
        ...(sessionToken ? { 'X-Session': sessionToken } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: timeout.signal,
    });
  } catch {
    if (opts.signal?.aborted) throw new ApiError('cancelled', 'Cancelled.');
    if (timeout.signal.aborted) throw new ApiError('timeout', 'This is taking longer than expected.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError('offline', "You're offline. Check your connection and try again.");
    }
    throw new ApiError('network', "We couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = data?.error?.code ?? (res.status >= 500 ? 'server_error' : 'error');
    if (code === 'session_expired') onExpired?.();
    throw new ApiError(code, data?.error?.message ?? 'Something went wrong. Please try again.', res.status, data);
  }
  return data as T;
}
