import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from '../../../../../TypeChecking/GeneralPurpose/AuthRequest';
import AuthAccountService from '../Services/AuthAccountService';
import { HttpStatusCodeEnum } from '../../../../../Utils/HttpStatusCodeEnum';
import {
  ERROR,
  NULL_OBJECT,
  SOMETHING_WENT_WRONG,
} from '../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';

class RemovePlatformController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = (request as AuthRequest).authAccount;
      const { platform } = request.body;
      const updatedUser = await AuthAccountService.removeStreamPlatform(
        user.userId,
        platform,
      );
      if (updatedUser == NULL_OBJECT) {
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          message: 'Platform does not exist.',
        });
        return;
      }
      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        message: 'Platform removed successfully.',
        data: updatedUser,
      });
      return;
    } catch (RemovePlatformControllerError) {
      console.error(
        'RemovePlatformControllerError.handle error ->',
        RemovePlatformControllerError,
      );
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }
}

export default new RemovePlatformController();
