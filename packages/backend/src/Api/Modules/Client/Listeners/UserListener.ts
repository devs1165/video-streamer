import { Request, Response, NextFunction } from 'express';

export const UserListener = {
  async onUserSignIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Your sign-in logic here
      console.log('User signed in');
      next();
    } catch (error) {
      next(error);
    }
  },

  async onUserSignUp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Your sign-up logic here
      console.log('User signed up');
      next();
    } catch (error) {
      next(error);
    }
  },
};
