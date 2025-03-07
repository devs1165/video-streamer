import { NextFunction, Request, Response } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
  EMAIL_SIGN_IN_TOKEN_REQUEST_SUCCESS,
  NO_TOKEN_RECORD,
  TOKEN_EXPIRED,
  TOKEN_VALIDATION_SUCCESS,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import AuthAccountService from '../Services/AuthAccountService';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';
import AuthTokensService from 'Api/Modules/Client/Authentication/Services/AuthTokensService';
import { generateStringOfLength } from 'Utils/generateStringOfLength';
import { businessConfig } from 'Config/businessConfig';
import { EmailService } from 'Logic/Services/Email/EmailService';
import { JwtHelper } from 'Api/Modules/Common/Helpers';
import { AuthAccountType } from '../TypeChecking/AuthAccount';

const dbContext = container.resolve(DbContext);

class EmailSignInController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();

    await queryRunner.startTransaction();
    try {
      const { email } = request.query;

      const existingToken = await AuthTokensService.getUserTokenByEmail(
        String(email),
      );
      if (existingToken) {
        await AuthTokensService.deleteUserToken(existingToken.token);
      }

      const token = generateStringOfLength(businessConfig.signInTokenLength);
      const otpToken = await AuthTokensService.createEmailSignInToken({
        email: String(email),
        token,
        queryRunner,
      });

      await queryRunner.commitTransaction();
      await EmailService.sendAccountActivationEmail({
        userEmail: String(email),
        activationToken: otpToken.token,
      });

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: EMAIL_SIGN_IN_TOKEN_REQUEST_SUCCESS,
      });
      return
    } catch (EmailSignInControllerhandleError) {
      console.log(
        'EmailSignInController.handle error ->',
        EmailSignInControllerhandleError,
      );
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return
    }
  }

  public async verifyToken(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { email, token } = request.body;
      const tokenData = await AuthTokensService.getUserTokenByToken(token);

      if (!tokenData || tokenData.email !== email) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: NO_TOKEN_RECORD,
        });
        return
      }

      if (AuthTokensService.checkTokenExpired(tokenData.expiresOn)) {
        response.status(HttpStatusCodeEnum.FORBIDDEN).json({
          status_code: HttpStatusCodeEnum.FORBIDDEN,
          status: ERROR,
          message: TOKEN_EXPIRED,
        });
        return
      }

      const userProfile = await AuthAccountService.findOrCreateAuthAccount({
        userId: email,
        auth_provider: AuthAccountType.EMAIL,
        queryRunner,
      });

      if (!userProfile) {
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: 'User Account Not Found',
        });
        return
      }

      await AuthTokensService.deleteUserToken(token);

      const jwtToken = JwtHelper.signUser({
        userId: userProfile.userId,
        identifier: userProfile.identifier,
        auth_provider: AuthAccountType.EMAIL,
      });

      await queryRunner.commitTransaction();

      response
        .setHeader('Authorization', `Bearer ${jwtToken}`)
        .status(HttpStatusCodeEnum.OK)
        .json({
          status_code: HttpStatusCodeEnum.OK,
          status: SUCCESS,
          message: TOKEN_VALIDATION_SUCCESS,
          token: `Bearer ${jwtToken}`,
          data: userProfile.getProfile(),
        });
      return
    } catch (verifyTokenError) {
      console.error(
        'EmailSignInController.verifyToken error ->',
        verifyTokenError,
      );

      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return
    }
  }
}

export default new EmailSignInController();
