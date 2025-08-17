import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from 'src/director/entity/director.entity';
import { Genre } from 'src/genre/entity/genre.entity';

@Injectable()
export class MovieService {

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) { }

  async findAll(title?: string) {
    if (!title) {
      return await this.movieRepository.findAndCount({
        relations: ['director', 'genres'],
      });
    }

    return await this.movieRepository.findAndCount({
      where: {
        title: Like(`%${title}%`),
      },
      relations: ['director', 'genres'],
    });
  }

  async findOne(id: number) {
    const movie = await this.movieRepository.findOne({
      where: {
        id
      },
      relations: ['detail', 'director', 'genre'],
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

    const genres = await this.genreRepository.find({
      where: {
        id: In(createMovieDto.genreIds),
      },
    });

    if (genres.length !== createMovieDto.genreIds.length) {
      throw new NotFoundException(`genre not found find Ids :: ${genres.map(genre => genre.id).join(',')}`);
    }

    const movie = await this.movieRepository.save({
      title: createMovieDto.title,
      detail: {
        detail: createMovieDto.detail,
      },
      director,
      genres,
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

    const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

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

    let newGenres;

    if (genreIds) {
      const genres = await this.genreRepository.find({
        where: {
          id: In(genreIds),
        }
      });

      if (genres.length !== genreIds.length) {
        throw new NotFoundException(`genre not found find Ids :: ${genres.map(genre => genre.id).join(',')}`);
      }

      newGenres = genres;
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
      relations: ['detail', 'director', 'genres'],
    });

    if (!newMovie) {
      throw new NotFoundException('movie not found');
    }

    if (genreIds) {
      newMovie.genres = newGenres;

      await this.movieRepository.save(newMovie);

      const newMovie2 = await this.movieRepository.findOne({
        where: {
          id
        },
        relations: ['detail', 'director', 'genres'],
      });
      
      return newMovie2;
    }

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
