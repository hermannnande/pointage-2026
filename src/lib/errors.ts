export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Non autorisé") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès interdit") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Données invalides",
    public errors?: Record<string, string[]>,
  ) {
    super(message, 422, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = "Quota dépassé") {
    super(message, 403, "QUOTA_EXCEEDED");
    this.name = "QuotaExceededError";
  }
}

export class SubscriptionRequiredError extends AppError {
  constructor(message = "Abonnement requis") {
    super(message, 402, "SUBSCRIPTION_REQUIRED");
    this.name = "SubscriptionRequiredError";
  }
}
