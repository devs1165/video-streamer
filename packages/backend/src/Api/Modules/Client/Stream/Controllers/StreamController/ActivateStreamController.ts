import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { DbContext } from '../../../../../../Lib/Infra/Internal/DBContext';
import { HttpStatusCodeEnum } from '../../../../../../Utils/HttpStatusCodeEnum';
import StreamService from '../../../../../../Api/Modules/Client/Stream/Services/StreamService';
import {
  ERROR,
  SUCCESS,
  RESOURCE_NOT_FOUND,
  INFORMATION_UPDATED,
  NULL_OBJECT,
} from '../../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';

const dbContext = container.resolve(DbContext);

class ActivateStreamController {
  // public async handle(request: Request, response: Response) {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {

    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { streamId } = request.params;

      const livepeerId = await StreamService.getStreamByIdentifier(streamId);
      if (livepeerId == NULL_OBJECT) {
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: RESOURCE_NOT_FOUND,
        });
        return;
      }

      const activatedStream = await StreamService.activateStream(
        livepeerId.livepeerStreamId,
        queryRunner,
      );

      if (activatedStream == NULL_OBJECT) {
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
        message: INFORMATION_UPDATED,
      });
      return;
    } catch (ActivateStreamControllerError) {
      console.error(
        'ActivateStreamController.handle ActivateStreamControllerError:',
        ActivateStreamControllerError,
      );
      await queryRunner.rollbackTransaction();

      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: 'An error occurred while activating the stream.',
      });
      return;
    }
  }
}

export default new ActivateStreamController();
