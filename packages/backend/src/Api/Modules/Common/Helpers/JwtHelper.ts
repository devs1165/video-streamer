/* eslint-disable @typescript-eslint/no-unused-vars */
import { jwtConfig } from 'Config/index';
import jwt, { Algorithm, SignOptions } from 'jsonwebtoken';
import { UnauthenticatedError } from '../../../../Api/Modules/Common/Exceptions/UnauthenticatedError';
import { IAuthAccount } from '../../../../Api/Modules/Client/Authentication/TypeChecking/IAuthAccount';
import { ProjectRole } from '../../../../Api/Modules/Client/Project/TypeChecking/ProjectRole';


type JwtPayload = {
  identifier: string;
  userId: string;
  project_identifier: string;
  role: ProjectRole;
};

type ProjectInvite = {
  userId: string;
  role: ProjectRole;
  projectId: string;
};

export class JwtHelper {
  public static signUser(user: IAuthAccount) {
    return jwt.sign(
      {
        identifier: user.identifier,
        userId: user.userId,
        authProvider: user.auth_provider,
      },
      jwtConfig.jwtSecret,
      {
        expiresIn: '2d',
        algorithm: 'HS256',
      },
    );
  }

  public static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, jwtConfig.jwtSecret, {
        algorithms: ['HS256'],
      }) as JwtPayload;
    } catch (err) {
      throw new UnauthenticatedError();
    }
  }
  public static generateInviteToken(
    invitePayload: ProjectInvite,
    expiresIn: string | number = jwtConfig.jwtExpiresIn || '1d',
  ): string {
    const jwtSecret: string = jwtConfig.jwtSecret;

    const options: SignOptions = {
      // expiresIn: expiresIn as string, // Explicitly casting
      expiresIn: typeof expiresIn === 'number' ? expiresIn : expiresIn as SignOptions['expiresIn'],
      algorithm: 'HS256' as Algorithm,
    };

    return jwt.sign(invitePayload, jwtSecret, options);
  }
  // public static generateInviteToken(
  //   invitePayload: ProjectInvite,
  //   expiresIn: string | number = jwtConfig.jwtExpiresIn || '1d',
  // ): string {
  //   const jwtSecret: string = jwtConfig.jwtSecret;
  //   const options: { expiresIn: string | number; algorithm: Algorithm } = {
  //     expiresIn: expiresIn,
  //     algorithm: 'HS256',
  //   }
  //   return jwt.sign(invitePayload, jwtSecret, options);
  // }

  public static generateAccessToken(user: Partial<IAuthAccount>): string {
    return jwt.sign(
      {
        userId: user.userId,
      },
      jwtConfig.jwtSecret,
      {
        expiresIn: '2h',
        algorithm: 'HS256',
      },
    );
  }
}




// type JwtPayload = {
//   identifier: string;
//   userId: string;
//   project_identifier: string;
//   role: ProjectRole;
// };

// type ProjectInvite = {
//   userId: string;
//   role: ProjectRole;
//   projectId: string;
// };

// export class JwtHelper {
//   public static signUser(user: IAuthAccount) {
//     return jwt.sign(
//       {
//         identifier: user.identifier,
//         userId: user.userId,
//         authProvider: user.auth_provider,
//       },
//       jwtConfig.jwtSecret,
//       {
//         expiresIn: '2d',
//         algorithm: 'HS256',
//       },
//     );
//   }

//   public static verifyToken(token: string): JwtPayload {
//     try {
//       return jwt.verify(token, jwtConfig.jwtSecret, {
//         algorithms: ['HS256'],
//       }) as JwtPayload;
//     } catch (err) {
//       throw new UnauthenticatedError();
//     }
//   }

//   public static generateInviteToken(
//     invitePayload: ProjectInvite,
//     expiresIn = jwtConfig.jwtExpiresIn,
//   ): string {
//     const jwtSecret: string = jwtConfig.jwtSecret as string;
//     return jwt.sign(invitePayload, jwtSecret, {
//       expiresIn,
//       algorithm: 'HS256',
//     });
//   }

//   public static generateAccessToken(user: Partial<IAuthAccount>) {
//     return jwt.sign(
//       {
//         userId: user.userId,
//       },
//       jwtConfig.jwtSecret,
//       {
//         expiresIn: '2h',
//         algorithm: 'HS256',
//       },
//     );
//   }
// }
