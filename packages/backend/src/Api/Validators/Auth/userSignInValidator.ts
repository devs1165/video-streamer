// Validates user sign in/up data
export const userSignInValidator = {
  // Validate email format
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email is required';
    if (!emailRegex.test(value)) return 'Invalid email format';
    return '';
  },

  // Validate password requirements
  password: (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value))
      return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value))
      return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value))
      return 'Password must contain at least one number';
    if (!/[!@#$%^&*]/.test(value))
      return 'Password must contain at least one special character (!@#$%^&*)';
    return '';
  },

  // Validate username format and length
  username: (value: string) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value))
      return 'Username can only contain letters, numbers and underscores';
    return '';
  },

  // Validate confirm password matches password
  confirmPassword: (value: string, password: string) => {
    if (!value) return 'Please confirm your password';
    if (value !== password) return 'Passwords do not match';
    return '';
  },
};
