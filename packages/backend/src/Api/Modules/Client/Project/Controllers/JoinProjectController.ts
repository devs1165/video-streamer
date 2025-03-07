import { NextFunction, Request, Response } from 'express';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
  PEER_ADDED_TO_PROJECT,
  INVALID_TOKEN_TYPE,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import { JwtHelper } from 'Api/Modules/Common/Helpers/JwtHelper';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';
import ProjectService from 'Api/Modules/Client/Project/Services/ProjectService';

const dbContext = container.resolve(DbContext);

class JoinProjectController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();

    await queryRunner.startTransaction();
    try {
      const { projectId } = request.params;
      const { token } = request.query;
      const project = await ProjectService.getProjectByIdentifier(projectId);

      if (!project) {
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: 'Project not found.',
        });
        return
      }

      const decodedToken = JwtHelper.verifyToken(String(token));

      if (!decodedToken) {
        response.status(HttpStatusCodeEnum.FORBIDDEN).json({
          status_code: HttpStatusCodeEnum.FORBIDDEN,
          status: ERROR,
          message: INVALID_TOKEN_TYPE,
        });
        return
      }

      const { userId, role } = decodedToken;
      await ProjectService.addProjectPeer(
        projectId,
        { userId, role },
        queryRunner,
      );

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: PEER_ADDED_TO_PROJECT,
      });
      return
    } catch (JoinProjectError) {
      console.log(
        '🚀 ~ JoinProjectController.handle JoinProjectError ->',
        JoinProjectError,
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

export default new JoinProjectController();
