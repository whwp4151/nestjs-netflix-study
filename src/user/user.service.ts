import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    return await this.userRepository.save(createUserDto);
  }

  async findAll() {
    return await this.userRepository.find();
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id
      }
    });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: {
        id
      }
    });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    await this.userRepository.update(
      {id},
      updateUserDto,
    )

    return await this.userRepository.findOne({
      where: {
        id
      }
    });
  }

  async remove(id: number) {
    const user = await this.userRepository.findOne({
      where: {
        id
      }
    });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    await this.userRepository.delete(id);

    return id;
  }
}
