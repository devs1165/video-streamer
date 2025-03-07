import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import StreamService from '../../../../../../Api/Modules/Client/Stream/Services/StreamService';
import { DbContext } from '../.../../../../../../../Lib/Infra/Internal/DBContext';
import { HttpStatusCodeEnum } from '../../../../../../Utils/HttpStatusCodeEnum';
import {
  RESOURCE_CREATED,
  SOMETHING_WENT_WRONG,
  ERROR,
  SUCCESS,
  NULL_OBJECT,
  RESOURCE_NOT_CREATED,
} from '../../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';
import ProjectService from '../../../../../../Api/Modules/Client/Project/Services/ProjectService';

const dbContext = container.resolve(DbContext);

class CreateStreamController {
  // public async handle(request: Request, response: Response) {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { projectId } = request.params;
      const {
        title,
        description,
        profiles,
        scheduleDate,
        platforms,
        visibility = true,
      } = request.body;

      const { error } = await ProjectService.validateMultistreamTokens(
        projectId,
        platforms,
        queryRunner,
      );

      if (error) {
        console.error(
          'CreateStreamController.handle -> MultiStreamTokenError:',
          error,
        );
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: error,
        });
        return;
      }

      const stream = await StreamService.createStream(
        {
          projectId,
          title,
          description,
          profiles,
          scheduleDate,
          platforms,
          visibility,
        },
        queryRunner,
      );

      if (stream == NULL_OBJECT) {
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: RESOURCE_NOT_CREATED,
        });
        return;
      }

      await queryRunner.commitTransaction();
      response.status(HttpStatusCodeEnum.CREATED).json({
        status_code: HttpStatusCodeEnum.CREATED,
        status: SUCCESS,
        message: RESOURCE_CREATED,
        results: stream.singleView(),
      });
      return;
    } catch (CreateStreamControllerError) {
      console.error(
        'CreateStreamController.handle CreateStreamError:',
        CreateStreamControllerError,
      );
      await queryRunner.rollbackTransaction();

      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }
}

export default new CreateStreamController();
