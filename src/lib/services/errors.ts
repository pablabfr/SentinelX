export class MissingApiKeyError extends Error {
  service: string;
  constructor(service: string) {
    super(`${service} API key is required`);
    this.name = "MissingApiKeyError";
    this.service = service;
  }
}

export class UpstreamError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
