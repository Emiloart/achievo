export type AsyncStatus = "idle" | "loading" | "pending" | "confirmed" | "failed" | "unknown";

export type AsyncState<T> = {
  status: AsyncStatus;
  data?: T;
  error?: string;
};

export function asyncIdle<T>(data?: T): AsyncState<T> {
  return { status: "idle", data };
}

export function asyncLoading<T>(data?: T): AsyncState<T> {
  return { status: "loading", data };
}

export function asyncPending<T>(data?: T): AsyncState<T> {
  return { status: "pending", data };
}

export function asyncConfirmed<T>(data?: T): AsyncState<T> {
  return { status: "confirmed", data };
}

export function asyncFailed<T>(error: string, data?: T): AsyncState<T> {
  return { status: "failed", error, data };
}

export function asyncUnknown<T>(error?: string, data?: T): AsyncState<T> {
  return { status: "unknown", error, data };
}
