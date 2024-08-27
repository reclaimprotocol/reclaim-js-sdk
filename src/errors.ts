

export class TimeoutError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'TimeoutError'
    }
}


export class ProofNotVerifiedError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'ProofNotVerifiedError'
    }
}

export class SessionNotStartedError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'SessionNotStartedError'
    }
}

export class ProviderAPIError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'ProviderAPIError'
    }
}

export class BuildProofRequestError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'BuildProofRequest'
    }
}

export class SignatureGeneratingError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'SignatureGeneratingError'
    }
}

export class SignatureNotFoundError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'SignatureNotFound'
    }
}

export class InvalidSignatureError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'InvalidSignatureError'
    }
}


export class UpdateSessionError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'UpdateSessionError'
    }
}

export class CreateSessionError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'CreateSessionError'
    }
}

export class ProviderFailedError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'ProviderFailedError'
    }
}
export class InvalidParamError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'InvalidParamError'
    }
}
export class ApplicationError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'ApplicationError'
    }
}