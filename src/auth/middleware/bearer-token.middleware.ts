import { BadRequestException, Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NextFunction, Request, Response } from "express";
import { envVariableKeys } from "src/common/const/env.const";

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {

    constructor (
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            next();
            return;
        }

        const token = this.validateBearerToken(authHeader);
        
        try {
            const decodedPayload = this.jwtService.decode(token);

            if (decodedPayload.type !== 'refresh' && decodedPayload.type !== 'access') {
                throw new UnauthorizedException('잘못된 토큰입니다.');
            }

            const secretKey = decodedPayload.type === 'refresh' ? 
                envVariableKeys.refreshTokenSecret : 
                envVariableKeys.accessTokenSecret;

            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>(secretKey),
            });

            const isRefreshToken = payload.type === 'refresh';

            if (isRefreshToken) {
                if (payload.type !== 'refresh') {
                    throw new BadRequestException('Refresh 토큰을 입력해주세요');
                }
            } else {
                if (payload.type !== 'access') {
                    throw new BadRequestException('Access 토큰을 입력해주세요');
                }
            }

            req.user = payload;
            next();
        } catch (e) {
            throw new UnauthorizedException('토큰이 만료되었습니다');
        }
    }

    validateBearerToken(rawToken: string) {
        const basicSplit = rawToken.split(' ');
        
        if (basicSplit.length !== 2) {
            throw new BadRequestException('token error');
        }

        const [beareer, token] = basicSplit;

        if (beareer.toLocaleLowerCase() !== 'bearer') {
            throw new BadRequestException('token error');
        }

        return token;
    }

}
