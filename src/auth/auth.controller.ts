import { Controller, Post, Headers, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("/register")
  registerUser(@Headers('authorization') token: string) {
    return this.authService.register(token);
  }

}
