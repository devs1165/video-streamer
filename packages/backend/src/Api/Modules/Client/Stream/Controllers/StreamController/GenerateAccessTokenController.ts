import { Request, Response, NextFunction } from 'express';
import { HttpStatusCodeEnum } from '../../../../../../Utils/HttpStatusCodeEnum';
import { JwtHelper } from '../../../../../../Api/Modules/Common/Helpers/JwtHelper';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
  TOKEN_GENERATION_SUCCESS,
} from '../../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';
import { AuthRequest } from '../../../../../../TypeChecking/GeneralPurpose/AuthRequest';

class GenerateAccessTokenController {
  // public async handle(request: Request, response: Response) {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {

    try {
      const user = (request as AuthRequest).authAccount;
      const jwtToken = JwtHelper.generateAccessToken(user);

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: TOKEN_GENERATION_SUCCESS,
        access_token: jwtToken,
      });
      return;
    } catch (error) {
      console.log('AccessTokenController.generateAccessToken error ->', error);
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }
}

export default new GenerateAccessTokenController();
