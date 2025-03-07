import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  ERROR,
  NULL_OBJECT,
  PROJECT_RESOURCE,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import { AuthRequest } from 'TypeChecking/GeneralPurpose/AuthRequest';
import ProjectService from 'Api/Modules/Client/Project/Services/ProjectService';
import { RESOURCE_RECORD_NOT_FOUND } from 'Api/Modules/Common/Helpers/Messages/SystemMessageFunctions';

const dbContext = container.resolve(DbContext);

class DeleteProjectController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();

    await queryRunner.startTransaction();
    try {
      const { projectId } = request.params;

      const user = (request as AuthRequest).authAccount;

      const project = await ProjectService.getProjectByIdentifier(projectId);

      if (project === NULL_OBJECT) {
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: RESOURCE_RECORD_NOT_FOUND(PROJECT_RESOURCE),
        });
        return
      }

      if (project.owner.userId !== user.userId) {
        response.status(HttpStatusCodeEnum.FORBIDDEN).json({
          status_code: HttpStatusCodeEnum.FORBIDDEN,
          status: ERROR,
          message: 'You are not authorized to delete this project.',
        });
        return
      }

      await ProjectService.deleteProject(projectId, queryRunner);

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.NO_CONTENT).json({
        status_code: HttpStatusCodeEnum.NO_CONTENT,
        status: SUCCESS,
      });
      return
    } catch (DeleteProjectControllerError) {
      console.log(
        '🚀 ~ DeleteProjectController.handle DeleteProjectControllerError ->',
        DeleteProjectControllerError,
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

export default new DeleteProjectController();
