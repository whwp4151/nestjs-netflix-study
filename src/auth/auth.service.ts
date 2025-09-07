import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

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

        const [_, token] = basicSplit;

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

        const hash = await bcrypt.hash(password, this.configService.get<number>('HASH_ROUNDS', 10));

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

    async issueToken(user: User, isRefresh: boolean) {

        const refreshTokenSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
        const accessTokenSecret = this.configService.get<string>('ACCESS_TOKEN_SECRET');

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
