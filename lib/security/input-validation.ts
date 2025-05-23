export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
}

export function validateInput(
  data: Record<string, any>,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip validation for optional empty fields
    if (!rule.required && (value === undefined || value === null || value === '')) {
      sanitizedData[field] = value;
      continue;
    }

    // Convert to string for validation
    const strValue = String(value);

    // Check minimum length
    if (rule.minLength && strValue.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
      continue;
    }

    // Check maximum length
    if (rule.maxLength && strValue.length > rule.maxLength) {
      errors[field] = `${field} must be no more than ${rule.maxLength} characters`;
      continue;
    }

    // Check pattern
    if (rule.pattern && !rule.pattern.test(strValue)) {
      errors[field] = `${field} has invalid format`;
      continue;
    }

    // Custom validation
    if (rule.customValidator && !rule.customValidator(value)) {
      errors[field] = `${field} is invalid`;
      continue;
    }

    // Sanitize and store
    sanitizedData[field] = strValue.trim();
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
}

// Common validation schemas
export const USER_VALIDATION_SCHEMA: ValidationSchema = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  email: {
    required: true,
    maxLength: 254,
    pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  },
  displayName: {
    required: true,
    minLength: 1,
    maxLength: 50
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
  }
};

export const PROJECT_REQUEST_VALIDATION_SCHEMA: ValidationSchema = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  githubLink: {
    required: true,
    maxLength: 500,
    pattern: /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/?$/
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 1000
  },
  reason: {
    required: true,
    minLength: 10,
    maxLength: 1000
  }
};

export const COMMENT_VALIDATION_SCHEMA: ValidationSchema = {
  text: {
    required: true,
    minLength: 1,
    maxLength: 2000
  },
  projectName: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9._-]+$/
  }
};

export const RATING_VALIDATION_SCHEMA: ValidationSchema = {
  rating: {
    required: true,
    customValidator: (value) => {
      const num = Number(value);
      return Number.isInteger(num) && num >= 1 && num <= 5;
    }
  },
  review: {
    required: false,
    maxLength: 1000
  },
  projectName: {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9._-]+$/
  }
};