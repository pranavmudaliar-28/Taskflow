import { useState, useCallback } from 'react';

export type ValidationRule<T = any> = {
    validate: (value: T) => boolean;
    message: string;
};

export type FieldValidation = {
    required?: boolean | string;
    minLength?: { value: number; message: string };
    maxLength?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
    custom?: ValidationRule[];
};

export type FormValidation<T> = {
    [K in keyof T]?: FieldValidation;
};

export type FieldErrors<T> = {
    [K in keyof T]?: string;
};

export function useFormValidation<T extends Record<string, any>>(
    validationRules: FormValidation<T>
) {
    const [errors, setErrors] = useState<FieldErrors<T>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

    const validateField = useCallback(
        (name: keyof T, value: any): string | undefined => {
            const rules = validationRules[name];
            if (!rules) return undefined;

            // Required validation
            if (rules.required) {
                const isEmpty = value === undefined || value === null || value === '' ||
                    (Array.isArray(value) && value.length === 0);
                if (isEmpty) {
                    return typeof rules.required === 'string'
                        ? rules.required
                        : 'This field is required';
                }
            }

            // Skip other validations if empty and not required
            if (!value && !rules.required) return undefined;

            // Min length validation
            if (rules.minLength && typeof value === 'string') {
                if (value.length < rules.minLength.value) {
                    return rules.minLength.message;
                }
            }

            // Max length validation
            if (rules.maxLength && typeof value === 'string') {
                if (value.length > rules.maxLength.value) {
                    return rules.maxLength.message;
                }
            }

            // Pattern validation
            if (rules.pattern && typeof value === 'string') {
                if (!rules.pattern.value.test(value)) {
                    return rules.pattern.message;
                }
            }

            // Custom validations
            if (rules.custom) {
                for (const rule of rules.custom) {
                    if (!rule.validate(value)) {
                        return rule.message;
                    }
                }
            }

            return undefined;
        },
        [validationRules]
    );

    const validateForm = useCallback(
        (values: T): boolean => {
            const newErrors: FieldErrors<T> = {};
            let isValid = true;

            Object.keys(validationRules).forEach((key) => {
                const fieldName = key as keyof T;
                const error = validateField(fieldName, values[fieldName]);
                if (error) {
                    newErrors[fieldName] = error;
                    isValid = false;
                }
            });

            setErrors(newErrors);
            return isValid;
        },
        [validateField, validationRules]
    );

    const handleBlur = useCallback(
        (name: keyof T, value: any) => {
            setTouched((prev) => ({ ...prev, [name]: true }));
            const error = validateField(name, value);
            setErrors((prev) => ({ ...prev, [name]: error }));
        },
        [validateField]
    );

    const handleChange = useCallback(
        (name: keyof T, value: any) => {
            // Only validate if field has been touched
            if (touched[name]) {
                const error = validateField(name, value);
                setErrors((prev) => ({ ...prev, [name]: error }));
            }
        },
        [validateField, touched]
    );

    const clearError = useCallback((name: keyof T) => {
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
    }, []);

    const clearAllErrors = useCallback(() => {
        setErrors({});
        setTouched({});
    }, []);

    const getFieldError = useCallback(
        (name: keyof T): string | undefined => {
            return touched[name] ? errors[name] : undefined;
        },
        [errors, touched]
    );

    const hasError = useCallback(
        (name: keyof T): boolean => {
            return Boolean(touched[name] && errors[name]);
        },
        [errors, touched]
    );

    return {
        errors,
        touched,
        validateField,
        validateForm,
        handleBlur,
        handleChange,
        clearError,
        clearAllErrors,
        getFieldError,
        hasError,
    };
}

// Common validation rules
export const commonValidations = {
    email: {
        pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address',
        },
    },
    password: {
        minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
        },
    },
    strongPassword: {
        minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
        },
        custom: [
            {
                validate: (value: string) => /[A-Z]/.test(value),
                message: 'Password must contain at least one uppercase letter',
            },
            {
                validate: (value: string) => /[a-z]/.test(value),
                message: 'Password must contain at least one lowercase letter',
            },
            {
                validate: (value: string) => /[0-9]/.test(value),
                message: 'Password must contain at least one number',
            },
            {
                validate: (value: string) => /[!@#$%^&*(),.?":{}|<>]/.test(value),
                message: 'Password must contain at least one special character',
            },
        ],
    },
    url: {
        pattern: {
            value: /^https?:\/\/.+/,
            message: 'Please enter a valid URL',
        },
    },
    phone: {
        pattern: {
            value: /^\+?[\d\s\-()]+$/,
            message: 'Please enter a valid phone number',
        },
    },
};
