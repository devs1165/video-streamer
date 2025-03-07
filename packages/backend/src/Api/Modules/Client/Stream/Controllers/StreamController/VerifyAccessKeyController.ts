import { Request, Response, NextFunction } from 'express';
import { HttpStatusCodeEnum } from '../../../../../../Utils/HttpStatusCodeEnum';
import { JwtHelper } from '../../../../../../Api/Modules/Common/Helpers/JwtHelper';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
} from '../../../../../../Api/Modules/Common/Helpers/Messages/SystemMessages';
import ProjectService from '../../../../../../Api/Modules/Client/Project/Services/ProjectService';
import AuthAccountService from '../../../../../../Api/Modules/Client/Authentication/Services/AuthAccountService';

class VerifyAccessTokenController {
  // public async handle(request: Request, response: Response) {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {

    try {
      const { accessKey, context } = request.body;
      const { projectId } = context;

      const { userId } = JwtHelper.verifyToken(accessKey);

      const Project = await ProjectService.getProjectByIdentifier(projectId);
      const User = await AuthAccountService.getAuthAccountByUserId(userId);

      const result = await ProjectService.viewProject(Project!, User!);
      if (!result) {
        response.status(HttpStatusCodeEnum.FORBIDDEN).json({
          status_code: HttpStatusCodeEnum.FORBIDDEN,
          status: ERROR,
          message: 'YOU ARENT AUTHORIZED TO WATCH',
        });
        return;
      }

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        message: 'Access token verified successfully.',
      });
      return;
    } catch (error) {
      console.log('VerifyAccessTokenController.handle error ->', error);
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }
}

export default new VerifyAccessTokenController();
