import { NextFunction, Request, Response } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import GitHubAuthService from 'Api/Modules/Client/Authentication/Services/GithubAuthService';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
  GITHUB_AUTHENTICATION_SUCCESS,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import { AuthAccountType } from 'Api/Modules/Client/Authentication/TypeChecking/AuthAccount';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';
import { JwtHelper } from 'Api/Modules/Common/Helpers/JwtHelper';
import AuthAccountService from '../Services/AuthAccountService';

const dbContext = container.resolve(DbContext);

class GitHubAuthController {
  public async handle(req: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const gitHubAuthUrl = GitHubAuthService.getGitHubAuthUrl();
      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        data: { authUrl: gitHubAuthUrl },
      });
      return
    } catch (error) {
      console.log('GitHubAuthController.handle error ->', error);
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return
    }
  }

  public async callback(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();

    await queryRunner.startTransaction();
    try {
      const { code } = request.body;

      if (!code) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'Authorization code is missing',
        });
        return
      }

      const token = await GitHubAuthService.getGitHubToken(code.toString());
      if (!token) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'Token not found',
        });
        return
      }
      const userInfo = await GitHubAuthService.getGitHubUserInfo(token);
      const gitHubAuthAccount =
        await AuthAccountService.findOrCreateAuthAccount({
          userId: userInfo.login,
          auth_provider: AuthAccountType.GITHUB,
          queryRunner,
        });

      if (!gitHubAuthAccount) {
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: 'GITHUB_AUTH_ACCOUNT_NOT_FOUND',
        });
        return
      }

      const jwtToken = JwtHelper.signUser({
        userId: gitHubAuthAccount.userId,
        identifier: gitHubAuthAccount.identifier,
        auth_provider: AuthAccountType.GITHUB,
      });

      await queryRunner.commitTransaction();
      response
        .setHeader('Authorization', `Bearer ${jwtToken}`)
        .status(HttpStatusCodeEnum.OK)
        .json({
          status_code: HttpStatusCodeEnum.OK,
          status: SUCCESS,
          message: GITHUB_AUTHENTICATION_SUCCESS,
          token: `Bearer ${jwtToken}`,
          data: gitHubAuthAccount.getProfile(),
        });
      return
    } catch (error) {
      console.log('GitHubAuthController.callback error ->', error);
      await queryRunner.rollbackTransaction();
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return
    }
  }
}

export default new GitHubAuthController();
