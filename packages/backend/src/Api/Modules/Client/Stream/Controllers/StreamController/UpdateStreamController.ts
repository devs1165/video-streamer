import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import StreamService from '../../../../../../Api/Modules/Client/Stream/Services/StreamService';
import { DbContext } from '../../../../../../Lib/Infra/Internal/DBContext';
import { HttpStatusCodeEnum } from '../../../../../../Utils/HttpStatusCodeEnum';
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
  INFORMATION_UPDATED,
} from '../../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';

const dbContext = container.resolve(DbContext);

class UpdateStreamController {
  // public async handle(request: Request, response: Response) {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { streamId } = request.params;
      const { title, description } = request.body;
      const updateData = { title, description };

      const stream = await StreamService.updateStream(
        streamId,
        updateData,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: INFORMATION_UPDATED,
        results: stream,
      });
      return;
    } catch (UpdateStreamControllerError) {
      console.error(
        'UpdateStreamController.handle UpdateStreamError:',
        UpdateStreamControllerError,
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

export default new UpdateStreamController();
