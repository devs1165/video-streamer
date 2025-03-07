import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import StreamService from '../../../../../../Api/Modules/Client/Stream/Services/StreamService';
import { DbContext } from '../../../../../../Lib/Infra/Internal/DBContext';
import { HttpStatusCodeEnum } from '../../../../../../Utils/HttpStatusCodeEnum';
import {
  ERROR,
  SOMETHING_WENT_WRONG,
  SUCCESS,
  NULL_OBJECT,
  RESOURCE_DELETED_SUCCESSFULLY,
  RESOURCE_NOT_FOUND,
} from '../../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';

const dbContext = container.resolve(DbContext);

class DeleteStreamController {
  // public async handle(request: Request, response: Response) {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {

    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { streamId } = request.params;

      const stream = await StreamService.deleteStream(streamId, queryRunner);

      if (stream === NULL_OBJECT) {
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: RESOURCE_NOT_FOUND,
        });
        return;
      }

      await queryRunner.commitTransaction();
      response.status(HttpStatusCodeEnum.NO_CONTENT).json({
        status_code: HttpStatusCodeEnum.NO_CONTENT,
        status: SUCCESS,
        message: RESOURCE_DELETED_SUCCESSFULLY,
      });
      return;
    } catch (DeleteStreamError) {
      console.error(
        'DeleteStreamController.handle DeleteStreamError:',
        DeleteStreamError,
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

export default new DeleteStreamController();
