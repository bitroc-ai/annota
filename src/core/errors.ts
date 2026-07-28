export type AnnotaErrorCode =
  | 'INVALID_ANNOTATION'
  | 'ANNOTATION_EXISTS'
  | 'ANNOTATION_NOT_FOUND'
  | 'INVALID_LAYER'
  | 'GEOMETRY_UNSUPPORTED'
  | 'MASK_DECODE_FAILED'
  | 'OPENCV_UNAVAILABLE'
  | 'OPENCV_EXTRACTION_FAILED';

export class AnnotaError extends Error {
  readonly code: AnnotaErrorCode;
  readonly cause?: unknown;

  constructor(code: AnnotaErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AnnotaError';
    this.code = code;
    this.cause = options?.cause;
  }
}

export class AnnotationValidationError extends AnnotaError {
  constructor(message: string, cause?: unknown) {
    super('INVALID_ANNOTATION', message, { cause });
    this.name = 'AnnotationValidationError';
  }
}

export class AnnotationExistsError extends AnnotaError {
  readonly annotationId: string;

  constructor(annotationId: string) {
    super('ANNOTATION_EXISTS', `Annotation ${annotationId} already exists`);
    this.name = 'AnnotationExistsError';
    this.annotationId = annotationId;
  }
}

export class AnnotationNotFoundError extends AnnotaError {
  readonly annotationId: string;

  constructor(annotationId: string) {
    super('ANNOTATION_NOT_FOUND', `Annotation ${annotationId} does not exist`);
    this.name = 'AnnotationNotFoundError';
    this.annotationId = annotationId;
  }
}
