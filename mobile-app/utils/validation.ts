// utils/validation.ts
export interface ValidationResult {
    isValid: boolean;
    error?: string;
    sanitizedValue?: string;
  }
  
  const VALIDATION_PATTERNS = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE_INDIA: /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/,
    PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    PINCODE_INDIA: /^[1-9][0-9]{5}$/,
    NAME: /^[a-zA-Z\s]{2,50}$/,
    ADDRESS: /^[a-zA-Z0-9\s,.-]{5,200}$/,
  } as const;
  
  const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)/i,
    /(--|\/\*|\*\/)/,
    /(;|\||\|\||&&)/,
    /(\bOR\b|\bAND\b).*?[=<>]/i,
    /(script|javascript|vbscript|onload|onerror|onclick)/i,
  ];
  
  const XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /on\w+\s*=\s*["']?[^"'>]*["']?/gi,
    /javascript\s*:/gi,
    /<(object|embed|applet|meta|link|style)/gi,
  ];
  
  export class InputValidator {
    static sanitizeInput(input: string): string {
      if (!input) return '';
      
      return input
        .trim()
        .replace(/\0/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\s+/g, ' ');
    }
  
    static hasSQLInjection(input: string): boolean {
      return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
    }
  
    static hasXSS(input: string): boolean {
      return XSS_PATTERNS.some(pattern => pattern.test(input));
    }
  
    static validateEmail(email: string): ValidationResult {
      const sanitized = this.sanitizeInput(email);
      
      if (!sanitized) {
        return { isValid: false, error: 'Email is required' };
      }
  
      if (sanitized.length > 100) {
        return { isValid: false, error: 'Email is too long' };
      }
  
      if (!VALIDATION_PATTERNS.EMAIL.test(sanitized)) {
        return { isValid: false, error: 'Please enter a valid email address' };
      }
  
      if (this.hasSQLInjection(sanitized) || this.hasXSS(sanitized)) {
        return { isValid: false, error: 'Invalid email format' };
      }
  
      return { 
        isValid: true, 
        sanitizedValue: sanitized.toLowerCase() 
      };
    }
  
    static validatePhone(phone: string): ValidationResult {
      const sanitized = this.sanitizeInput(phone);
      
      if (!sanitized) {
        return { isValid: false, error: 'Phone number is required' };
      }
  
      const digitsOnly = sanitized.replace(/\D/g, '');
      
      if (digitsOnly.length < 10 || digitsOnly.length > 13) {
        return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
      }
  
      let formatted = digitsOnly;
      if (formatted.length === 10) {
        formatted = `+91${formatted}`;
      } else if (formatted.length === 12 && formatted.startsWith('91')) {
        formatted = `+${formatted}`;
      } else if (!formatted.startsWith('+91')) {
        return { isValid: false, error: 'Please enter a valid Indian phone number' };
      }
  
      return { 
        isValid: true, 
        sanitizedValue: formatted 
      };
    }
  
    static validatePassword(password: string): ValidationResult {
      if (!password) {
        return { isValid: false, error: 'Password is required' };
      }
  
      if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters long' };
      }
  
      if (password.length > 128) {
        return { isValid: false, error: 'Password is too long' };
      }
  
      if (!VALIDATION_PATTERNS.PASSWORD_STRONG.test(password)) {
        return { 
          isValid: false, 
          error: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character' 
        };
      }
  
      const weakPasswords = ['password', '12345678', 'qwerty123', 'password123'];
      if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
        return { isValid: false, error: 'Please choose a stronger password' };
      }
  
      return { isValid: true, sanitizedValue: password };
    }
  
    static validateName(name: string): ValidationResult {
      const sanitized = this.sanitizeInput(name);
      
      if (!sanitized) {
        return { isValid: false, error: 'Name is required' };
      }
  
      if (sanitized.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters long' };
      }
  
      if (sanitized.length > 50) {
        return { isValid: false, error: 'Name is too long' };
      }
  
      if (!VALIDATION_PATTERNS.NAME.test(sanitized)) {
        return { isValid: false, error: 'Name can only contain letters and spaces' };
      }
  
      if (this.hasSQLInjection(sanitized) || this.hasXSS(sanitized)) {
        return { isValid: false, error: 'Invalid name format' };
      }
  
      const capitalized = sanitized
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  
      return { 
        isValid: true, 
        sanitizedValue: capitalized 
      };
    }
  
    static validateSearchQuery(query: string): ValidationResult {
      if (!query) {
        return { isValid: true, sanitizedValue: '' };
      }
  
      const sanitized = this.sanitizeInput(query);
      
      if (sanitized.length > 100) {
        return { isValid: false, error: 'Search query is too long' };
      }
  
      if (this.hasSQLInjection(sanitized) || this.hasXSS(sanitized)) {
        return { isValid: false, error: 'Invalid search query' };
      }
  
      return { 
        isValid: true, 
        sanitizedValue: sanitized 
      };
    }
  
    static validateTextInput(
      input: string, 
      fieldName: string, 
      minLength = 1, 
      maxLength = 1000
    ): ValidationResult {
      const sanitized = this.sanitizeInput(input);
      
      if (!sanitized && minLength > 0) {
        return { isValid: false, error: `${fieldName} is required` };
      }
  
      if (sanitized.length < minLength) {
        return { 
          isValid: false, 
          error: `${fieldName} must be at least ${minLength} characters long` 
        };
      }
  
      if (sanitized.length > maxLength) {
        return { 
          isValid: false, 
          error: `${fieldName} must be less than ${maxLength} characters` 
        };
      }
  
      if (this.hasSQLInjection(sanitized) || this.hasXSS(sanitized)) {
        return { isValid: false, error: `${fieldName} contains invalid characters` };
      }
  
      return { 
        isValid: true, 
        sanitizedValue: sanitized 
      };
    }
  }