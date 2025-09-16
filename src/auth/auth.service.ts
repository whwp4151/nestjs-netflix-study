import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Role, User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { envVariableKeys } from 'src/common/const/env.const';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) {}

    parseBasicToken(rawToken: string) {
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) {
            throw new BadRequestException('token error');
        }

        const [basic, token] = basicSplit;

        if (basic.toLocaleLowerCase() !== 'basic') {
            throw new BadRequestException('token error');
        }

        const decoded = Buffer.from(token, 'base64').toString('utf-8');

        const tokenSplit = decoded.split(':');

        if (tokenSplit.length !== 2) {
            throw new BadRequestException('token error');
        }

        const [email, password] = tokenSplit;

        return {
            email,
            password,
        }
    }

    async parseBearerToken(rawToken: string, isRefreshToken: boolean) {
        const basicSplit = rawToken.split(' ');

        if (basicSplit.length !== 2) {
            throw new BadRequestException('token error');
        }

        const [beareer, token] = basicSplit;

        if (beareer.toLocaleLowerCase() !== 'bearer') {
            throw new BadRequestException('token error');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>(
                    isRefreshToken ? envVariableKeys.refreshTokenSecret : envVariableKeys.accessTokenSecret
                ),
            });

            if (isRefreshToken) {
                if (payload.type !== 'refresh') {
                    throw new BadRequestException('Refresh 토큰을 입력해주세요');
                }
            } else {
                if (payload.type !== 'access') {
                    throw new BadRequestException('Access 토큰을 입력해주세요');
                }
            }

            return payload;
        } catch (e) {
            throw new UnauthorizedException('토큰이 만료되었습니다');
        }
    }

    async register(rawToken: string) {
        const {email, password} = this.parseBasicToken(rawToken);

        const user = await this.userRepository.findOne({
            where: {
                email,
            }
        });

        if (user) {
            throw new BadRequestException('이미 가입한 이메일 입니다.');
        }

        const hash = await bcrypt.hash(password, this.configService.get<number>(envVariableKeys.hashRounds, 10));

        await this.userRepository.save({
            email,
            password:hash,
        });

        return await this.userRepository.findOne({
            where: {
                email,
            }
        })
    }

    async authenticate(email: string, password: string) {
        const user = await this.userRepository.findOne({
            where: {
                email,
            }
        });

        if (!user) {
            throw new BadRequestException('로그인 정보가 잘못됐습니다');
        }

        const passOk = await bcrypt.compare(password, user.password);

        if (!passOk) {
            throw new BadRequestException('로그인 정보가 잘못됐습니다.');
        }

        return user;
    }

    async issueToken(user: {id: number, role: Role}, isRefresh: boolean) {

        const refreshTokenSecret = this.configService.get<string>(envVariableKeys.refreshTokenSecret);
        const accessTokenSecret = this.configService.get<string>(envVariableKeys.accessTokenSecret);

        return await this.jwtService.signAsync({
                sub: user.id,
                role: user.role,
                type: isRefresh ? 'refresh' : 'access',
            }, {
                secret: isRefresh ? refreshTokenSecret : accessTokenSecret,
                expiresIn: isRefresh ? '24h' : 300,
            });
    }

    async login(rawToken: string) {
        const {email, password} = this.parseBasicToken(rawToken);

        const user = await this.authenticate(email, password);

        return {
            refreshToken: await this.issueToken(user, true),
            accessToken: await this.issueToken(user, false),
        };
    }
 
}
