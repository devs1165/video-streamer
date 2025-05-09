import { NextFunction, Request, Response } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import AuthAccountService from '../Services/AuthAccountService';
import { AuthRequest } from 'Api/TypeChecking';
import { NotificationStatus } from '../TypeChecking/Notification';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';

const dbContext = container.resolve(DbContext);
class NotificationController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const user = (request as AuthRequest).authAccount;

      const userProfile = await AuthAccountService.getAuthAccountByUserId(
        user.userId,
      );

      if (!userProfile) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'User Account Not Found',
        });
        return;
      }

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        data: userProfile.getNotifications(),
      });
      return;
    } catch (error) {
      console.log('NotificationController.handle error ->', error);
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }
  public async fetchByIdentifier(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();
    try {
      const { notificationId } = request.params;

      const user = (request as AuthRequest).authAccount;

      const userProfile = await AuthAccountService.getAuthAccountByUserId(
        user.userId,
      );

      if (!userProfile) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'User Account Not Found',
        });
        return;
      }

      const notification = await AuthAccountService.getNotificationByIdentifier(
        userProfile,
        notificationId,
      );
      notification!.status = NotificationStatus.READ;

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        data: notification,
      });
      return;
    } catch (error) {
      console.log('NotificationController.fetchByIdentifier error ->', error);
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

export default new NotificationController();
