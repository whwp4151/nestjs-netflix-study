import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

@Injectable()
export class MovieService {

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>
  ) {}

  async getManyMovies(title?: string) {
    if (!title) {
      return await this.movieRepository.findAndCount();
    }

    return await this.movieRepository.findAndCount({
      where: {
        title: Like(`%${title}%`),
      }
    });
  }

  async getMovieById(id: number) {
    const movie = await this.movieRepository.findOne({
      where: {
        id
      }
    });

    if (!movie) {
      throw new NotFoundException('movie not found');
    }

    return movie;
  }

  async createMovie(createMovieDto: CreateMovieDto) {
    const movie = await this.movieRepository.save(createMovieDto);

    return movie;
  }

  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = await this.movieRepository.findOne({
      where: {
        id
      }
    });

    if (!movie) {
      throw new NotFoundException('movie not found');
    }

    await this.movieRepository.update(
      {id},
      updateMovieDto
    );

    const newMovie = await this.movieRepository.findOne({
      where: {
        id
      }
    });

    return newMovie;
  }

  async deleteMovie(id: number) {
    const movie = await this.movieRepository.findOne({
      where: {
        id
      }
    });

    if (!movie) {
      throw new NotFoundException('movie not found');
    }

    await this.movieRepository.delete({
      id
    });

    return id;
  }
  
}
