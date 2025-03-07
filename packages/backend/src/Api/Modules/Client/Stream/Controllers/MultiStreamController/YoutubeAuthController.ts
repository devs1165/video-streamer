import { NextFunction, Request, Response } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import YouTubeAuthService from 'Api/Modules/Client/Stream/Services/MultiMediaServices/YoutubeService';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
  YOUTUBE_AUTHENTICATION_SUCCESS,
  NULL_OBJECT,
  RESOURCE_NOT_CREATED,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import AuthAccountService from 'Api/Modules/Client/Authentication/Services/AuthAccountService';
import { Platform } from '../../TypeChecking/MultiStreamUserDestination';
import { AuthRequest } from 'Api/TypeChecking';

class YouTubeAuthController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {

    try {
      const authUrl = YouTubeAuthService.getYouTubeAuthUrl();
      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        data: { authUrl },
      });
      return;
    } catch (error) {
      console.log('YouTubeAuthController.auth error ->', error);
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }

  public async callback(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = request.query;
      const user = (request as AuthRequest).authAccount;

      if (!code) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'Authorization code is missing',
        });
        return;
      }

      const tokenData = await YouTubeAuthService.exchangeCodeForTokens(
        code.toString(),
      );

      if (tokenData == NULL_OBJECT) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: RESOURCE_NOT_CREATED,
        });
        return;
      }

      const updatedAuthAccount = await AuthAccountService.updateStreamTokens(
        user.userId,
        {
          type: Platform.Youtube,
          token: {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
          },
        },
      );

      if (updatedAuthAccount == NULL_OBJECT) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: RESOURCE_NOT_CREATED,
        });
        return;
      }

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: YOUTUBE_AUTHENTICATION_SUCCESS,
        data: tokenData,
      });
      return;
    } catch (error) {
      console.log('YouTubeAuthController.callback error ->', error);
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }
}

export default new YouTubeAuthController();
