// filepath: c:\Users\chris\sourdough-web-calculator\src\services\AuthError.js
export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}