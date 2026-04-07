import { backendGatewayRequest, backendRefresh } from "./backendAdminAuth";
import type { AdminIdentity, AdminSession, BackendTokens } from "./adminSession";

type BackendRequest = {
  path: string;
  method: string;
  body?: unknown;
  query?: string;
};

type BackendResponse = {
  res: Response;
  json: any;
  text: string;
  tokens: BackendTokens;
  requestId: string | null;
  refreshed?: boolean;
  admin?: AdminIdentity;
};

function extractRequestId(headers: Headers, json: any) {
  return (
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    json?.requestId ||
    json?.error?.requestId ||
    null
  );
}

async function executeRequest(tokens: BackendTokens, request: BackendRequest): Promise<BackendResponse> {
  const path = request.query
    ? `${request.path}${request.query.startsWith("?") ? request.query : `?${request.query}`}`
    : request.path;
  const response = await backendGatewayRequest(path, {
    method: request.method,
    body: request.body,
    tokens,
  });
  return {
    ...response,
    requestId: extractRequestId(response.res.headers, response.json),
  };
}

export async function requestBackend(session: AdminSession, request: BackendRequest): Promise<BackendResponse> {
  const initial = await executeRequest(
    {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      csrfToken: session.csrfToken,
    },
    request,
  );

  if (initial.res.status !== 401) {
    return initial;
  }

  try {
    const refreshed = await backendRefresh({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      csrfToken: session.csrfToken,
    });
    const retried = await executeRequest(refreshed.tokens, request);
    return {
      ...retried,
      tokens: refreshed.tokens,
      refreshed: true,
      admin: refreshed.admin,
    };
  } catch {
    return initial;
  }
}
