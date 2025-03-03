/**
 * Creates a custom error class that extends the built-in Error class.
 *
 * The generated class accepts an optional error message and an optional inner error. When an inner error is provided, its name and message are appended to the main message (formatted as "caused by <innerError.name>: <innerError.message>"), and its stack trace is appended to the error's stack.
 *
 * @param name - The name assigned to the custom error class.
 * @returns A new error class with enhanced error message construction.
 *
 * @example
 * const TimeoutError = createErrorClass("TimeoutError");
 * throw new TimeoutError("Operation timed out", originalError);
 */
function createErrorClass(name: string) {
    return class extends Error {
        constructor(message?: string, public innerError?: Error) {
            // Include inner error message in the main message if available
            const fullMessage = innerError 
                ? `${message || ''} caused by ${innerError.name}: ${innerError.message}`
                : message;
                
            super(fullMessage);
            this.name = name;
            if (innerError) {
                this.stack += `\nCaused by: ${innerError.stack}`;
            }
        }
    };
}

export const TimeoutError = createErrorClass('TimeoutError');
export const ProofNotVerifiedError = createErrorClass('ProofNotVerifiedError');
export const SessionNotStartedError = createErrorClass('SessionNotStartedError');
export const ProviderNotFoundError = createErrorClass('ProviderNotFoundError');
export const BuildProofRequestError = createErrorClass('BuildProofRequestError');
export const SignatureGeneratingError = createErrorClass('SignatureGeneratingError');
export const SignatureNotFoundError = createErrorClass('SignatureNotFoundError');
export const InvalidSignatureError = createErrorClass('InvalidSignatureError');
export const UpdateSessionError = createErrorClass('UpdateSessionError');
export const InitSessionError = createErrorClass('InitSessionError');
export const ProviderFailedError = createErrorClass('ProviderFailedError');
export const InvalidParamError = createErrorClass('InvalidParamError');
export const ApplicationError = createErrorClass('ApplicationError');
export const InitError = createErrorClass('InitError');
export const AvailableParamsError = createErrorClass('AvailableParamsError')
export const BackendServerError = createErrorClass('BackendServerError');
export const GetStatusUrlError = createErrorClass('GetStatusUrlError');
export const NoProviderParamsError = createErrorClass('NoProviderParamsError');
export const SetParamsError = createErrorClass('SetParamsError');
export const AddContextError = createErrorClass('AddContextError');
export const SetSignatureError = createErrorClass('SetSignatureError');
export const GetAppCallbackUrlError = createErrorClass("GetAppCallbackUrlError");
export const GetRequestUrlError = createErrorClass('GetRequestUrlError');
export const StatusUrlError = createErrorClass('StatusUrlError');
export const ProofSubmissionFailedError = createErrorClass('ProofSubmissionFailedError');