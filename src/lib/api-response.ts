import { ContractError, isSupportedContractVersion, validateEnvelope } from './api-contract';

/** These headers accompany JSON and image responses, including failures. */
export function validateApiDiagnostics(headers: Headers) {
  const traceId = headers.get('X-Trace-ID');
  const contractVersion = headers.get('X-API-Contract-Version');
  if (
    !traceId ||
    !/^(?!0{32})[a-f0-9]{32}$/.test(traceId) ||
    !isSupportedContractVersion(contractVersion)
  )
    throw new ContractError();
  return { traceId, contractVersion };
}

/** Validate the transport and envelope together so their diagnostics cannot disagree. */
export function validateApiResponse(body: unknown, status: number, headers: Headers) {
  const contentType = headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new ContractError();
  const diagnostics = validateApiDiagnostics(headers);
  const envelope = validateEnvelope(body, status);
  if (
    envelope.traceId !== diagnostics.traceId ||
    (envelope.meta as { contractVersion: string }).contractVersion !== diagnostics.contractVersion
  )
    throw new ContractError();
  return envelope;
}
