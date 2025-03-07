// import { NextFunction, Response, Request } from 'express';
// import { Middleware } from 'TypeChecking/GeneralPurpose/Middleware';

// export const asyncMiddlewareHandler =
//   (fn: Middleware) =>
//   (request: Request, response: Response, next: NextFunction) =>
//     fn(request, response, next).catch(next);
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncMiddlewareHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
