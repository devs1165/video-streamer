import { NextFunction, Request, Response } from 'express';
import MetaMaskAuthService from 'Api/Modules/Client/Authentication/Services/MetaMaskAuthService';
import { HttpStatusCodeEnum } from 'Utils/HttpStatusCodeEnum';
import {
  SUCCESS,
  ERROR,
  SOMETHING_WENT_WRONG,
  METAMASK_AUTHENTICATION_SUCCESS,
} from 'Api/Modules/Common/Helpers/Messages/SystemMessages';
import { AuthAccountType } from 'Api/Modules/Client/Authentication/TypeChecking/AuthAccount';
import { container } from 'tsyringe';
import { DbContext } from 'Lib/Infra/Internal/DBContext';
import AuthAccountService from '../Services/AuthAccountService';
import { JwtHelper } from 'Api/Modules/Common/Helpers/JwtHelper';

const dbContext = container.resolve(DbContext);

class MetaMaskAuthController {
  public async handle(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { address } = request.body;
      if (!address) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'MetaMask Wallet Address is required',
        });
        return;
      }

      const metaMaskAuthAccount =
        await MetaMaskAuthService.findOrCreateAuthAccount({
          userId: JSON.stringify({ address }),
          auth_provider: AuthAccountType.METAMASK,
          queryRunner,
        });

      if (!metaMaskAuthAccount) {
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.NOT_FOUND).json({
          status_code: HttpStatusCodeEnum.NOT_FOUND,
          status: ERROR,
          message: 'USER_NOT_FOUND',
        });
        return;
      }

      await queryRunner.commitTransaction();

      response.status(HttpStatusCodeEnum.OK).json({
        status_code: HttpStatusCodeEnum.OK,
        status: SUCCESS,
        data: metaMaskAuthAccount.forWallet,
      });
      return;
    } catch (error) {
      console.log('MetaMaskAuthController.auth error ->', error);
      await queryRunner.rollbackTransaction();
      response.status(HttpStatusCodeEnum.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatusCodeEnum.INTERNAL_SERVER_ERROR,
        status: ERROR,
        message: SOMETHING_WENT_WRONG,
      });
      return;
    }
  }

  public async verify(request: Request, response: Response, next: NextFunction): Promise<void> {
    const queryRunner = await dbContext.getTransactionalQueryRunner();
    await queryRunner.startTransaction();

    try {
      const { address, signature } = request.body;

      if (!address || !signature) {
        response.status(HttpStatusCodeEnum.BAD_REQUEST).json({
          status_code: HttpStatusCodeEnum.BAD_REQUEST,
          status: ERROR,
          message: 'Address and signature are required',
        });
        return;
      }

      const isAuthenticated = await MetaMaskAuthService.verifySignature(
        address,
        signature,
        queryRunner,
      );

      if (!isAuthenticated) {
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.UNAUTHENTICATED).json({
          status_code: HttpStatusCodeEnum.UNAUTHENTICATED,
          status: ERROR,
          message: 'Invalid signature',
        });
        return;
      }

      const metaMaskAuthAccount =
        await AuthAccountService.getAuthAccountByUserId(address);

      if (!metaMaskAuthAccount) {
        await queryRunner.rollbackTransaction();
        response.status(HttpStatusCodeEnum.UNAUTHENTICATED).json({
          status_code: HttpStatusCodeEnum.UNAUTHENTICATED,
          status: ERROR,
          message: 'User not found',
        });
        return;
      }

      const token = JwtHelper.signUser({
        userId: metaMaskAuthAccount.userId,
        identifier: metaMaskAuthAccount.identifier,
        auth_provider: AuthAccountType.METAMASK,
      });

      await queryRunner.commitTransaction();

      response
        .setHeader('Authorization', `Bearer ${token}`)
        .status(HttpStatusCodeEnum.OK)
        .json({
          status_code: HttpStatusCodeEnum.OK,
          status: SUCCESS,
          message: METAMASK_AUTHENTICATION_SUCCESS,
        });
      return;
    } catch (error) {
      console.log('MetaMaskAuthController.verify error ->', error);
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

export default new MetaMaskAuthController();
