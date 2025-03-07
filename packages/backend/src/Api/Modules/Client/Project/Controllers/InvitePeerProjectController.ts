import { NextFunction, Request, Response } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  ERROR,
  INVITATION_SENT,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import { AuthRequest } from 'TypeChecking/GeneralPurpose/AuthRequest';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';
import ProjectService from 'Api/Modules/Client/Project/Services/ProjectService';

const dbContext = container.resolve(DbContext);

class ProjectInviteController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();

    await queryRunner.startTransaction();
    try {
      const user = (request as AuthRequest).authAccount;
      const { users } = request.body;
      const { projectId } = request.params;

      const isAuthorized =
        (await ProjectService.getProjectOwnerId(projectId)) === user.userId;

      if (!isAuthorized) {
        response.status(HttpStatusCodeEnum.FORBIDDEN).json({
          status_code: HttpStatusCodeEnum.FORBIDDEN,
          status: ERROR,
          message: 'You are not authorized to invite users to this project.',
        });
        return
      }

      await ProjectService.sendProjectInvite(users, projectId, queryRunner);

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: INVITATION_SENT,
      });
      return
    } catch (ProjectInviteControllerError) {
      console.log(
        '🚀 ~ ProjectInviteController.handle ProjectInviteControllerError ->',
        ProjectInviteControllerError,
      );
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

export default new ProjectInviteController();
