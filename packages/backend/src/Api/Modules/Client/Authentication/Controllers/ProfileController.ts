import { Request, Response, NextFunction } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
  NULL_OBJECT,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import AuthAccountService from '../Services/AuthAccountService';
import { AuthRequest } from 'Api/TypeChecking';

class ProfileController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = (request as AuthRequest).authAccount;

      const userProfile = await AuthAccountService.getAuthAccountByUserId(
        user.userId,
      );

      if (userProfile == NULL_OBJECT) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'User Account Not Found',
        });
        return
      }

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        data: userProfile.getProfile(),
      });
      return
    } catch (ProfileControllerError) {
      console.log('ProfileController.handle error ->', ProfileControllerError);
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return
    }
  }
}

export default new ProfileController();
