import { Request, Response, NextFunction } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  ERROR,
  INFORMATION_UPDATED,
  NULL_OBJECT,
  PROJECT_RESOURCE,
  SOMETHING_WENT_WRONG,
  SUCCESS,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';
import { AuthRequest } from 'TypeChecking/GeneralPurpose/AuthRequest';
import ProjectService from 'Api/Modules/Client/Project/Services/ProjectService';
import { RESOURCE_RECORD_NOT_FOUND } from 'Api/Modules/Common/Helpers/Messages/SystemMessageFunctions';

const dbContext = container.resolve(DbContext);

class UpdateProjectController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();

    await queryRunner.startTransaction();
    try {
      const user = (request as AuthRequest).authAccount;

      const { projectId } = request.params;

      const { title, description, image_url } = request.body;

      const project = await ProjectService.getProjectByIdentifier(projectId);

      if (project === NULL_OBJECT) {
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: RESOURCE_RECORD_NOT_FOUND(PROJECT_RESOURCE),
        });
        return;
      }
      const isAuthorizedUser = ProjectService.isUserAuthorized(project, user);

      if (!isAuthorizedUser) {
        response.status(HttpStatusCodeEnum.FORBIDDEN).json({
          status_code: HttpStatusCodeEnum.FORBIDDEN,
          status: ERROR,
          message: 'You are not authorized to update this project.',
        });
        return
      }

      const updatedProject = await ProjectService.updateProjectRecord(
        projectId,
        'identifier',
        { title, description, image_url },
        queryRunner,
      );

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: INFORMATION_UPDATED,
        results: updatedProject!.singleView(),
      });
      return
    } catch (UpdateProjectControllerError) {
      console.log(
        '🚀 ~ UpdateProjectController.handle UpdateProjectControllerError ->',
        UpdateProjectControllerError,
      );

      await queryRunner.rollbackTransaction();

      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return
    } finally {
      await queryRunner.release();
    }
  }
}

export default new UpdateProjectController();
