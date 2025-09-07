import { Controller, Post, Headers, UseInterceptors, ClassSerializerInterceptor, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './strategy/local.strategy';
import { JwtAuthGuard } from './strategy/jwt.strategy';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/register")
  registerUser(@Headers('authorization') token: string) {
    return this.authService.register(token);
  }

  @Post("/login")
  loginUser(@Headers('authorization') token: string) {
    return this.authService.login(token);
  }

  @UseGuards(LocalAuthGuard)
  @Post("/login/passport")
  loginUserPassport(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get("/private")
  private(@Request() req) {
    return req.user;
  }

}
