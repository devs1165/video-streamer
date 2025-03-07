import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { DbContext } from '../../../../../../Lib/Infra/Internal/DBContext';
import { HttpStatusCodeEnum } from '../../../../../../Utils/HttpStatusCodeEnum';
import StreamService from '../../../../../../Api/Modules/Client/Stream/Services/StreamService';
import {
  ERROR,
  SUCCESS,
  RESOURCE_NOT_FOUND,
  RESOURCE_TERMINATED,
  NULL_OBJECT,
} from '../../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';

const dbContext = container.resolve(DbContext);

class TerminateStreamController {
  // public async handle(request: Request, response: Response) {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {

    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { streamId } = request.params;

      const terminatedStream = await StreamService.terminateStream(
        streamId,
        queryRunner,
      );

      if (terminatedStream == NULL_OBJECT) {
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: RESOURCE_NOT_FOUND,
        });
        return;
      }

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: RESOURCE_TERMINATED,
      });
      return;
    } catch (TerminateStreamControllerError) {
      console.error(
        'TerminateStreamController.handle TerminateStreamControllerError:',
        TerminateStreamControllerError,
      );
      await queryRunner.rollbackTransaction();

      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: 'An error occurred while terminating the stream.',
      });
      return;
    }
  }
}

export default new TerminateStreamController();
