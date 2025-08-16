import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';

@Injectable()
export class MovieService {

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
  ) { }

  async findAll(title?: string) {
    if (!title) {
      return await this.movieRepository.findAndCount();
    }

    return await this.movieRepository.findAndCount({
      where: {
        title: Like(`%${title}%`),
      }
    });
  }

  async findOne(id: number) {
    const movie = await this.movieRepository.findOne({
      where: {
        id
      },
      relations: ['detail'],
    });

    if (!movie) {
      throw new NotFoundException('movie not found');
    }

    return movie;
  }

  async create(createMovieDto: CreateMovieDto) {
    const director = await this.directorRepository.findOne({
      where: {
        id: createMovieDto.directorId,
      },
    });

    if (!director) {
      throw new NotFoundException('director not found');
    }

    const movie = await this.movieRepository.save({
      title: createMovieDto.title,
      genre: createMovieDto.genre,
      detail: {
        detail: createMovieDto.detail,
      },
      director: director,
    });

    return movie;
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = await this.movieRepository.findOne({
      where: {
        id
      },
      relations: ['detail'],
    });

    if (!movie) {
      throw new NotFoundException('movie not found');
    }

    const { detail, directorId, ...movieRest } = updateMovieDto;

    let newDirector;

    if (directorId) {
      const director = await this.directorRepository.findOne({
        where: {
          id: directorId,
        },
      });

      if (!director) {
        throw new NotFoundException('director not found');
      }

      newDirector = director;
    }

    const movieUpdateField = {
      ...movieRest,
      ...(newDirector && {director : newDirector})
    };

    await this.movieRepository.update(
      { id },
      movieUpdateField,
    );

    if (detail) {
      await this.movieDetailRepository.update(
        {
          id: movie.detail.id,
        },
        {
          detail: detail,
        }
      )
    }

    const newMovie = await this.movieRepository.findOne({
      where: {
        id
      },
      relations: ['detail', 'director'],
    });

    return newMovie;
  }

  async remove(id: number) {
    const movie = await this.movieRepository.findOne({
      where: {
        id
      },
      relations: ['detail'],
    });

    if (!movie) {
      throw new NotFoundException('movie not found');
    }

    await this.movieRepository.delete(id);
    await this.movieDetailRepository.delete(movie.detail.id);

    return id;
  }

}
