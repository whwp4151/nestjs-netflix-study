import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Like, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) { }

  async findAll(title?: string) {
    const qd = await this.movieRepository.createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres');

    if (title) {
      qd.where('movie.title LIKE :title', {title: `%${title}%`});
    }

    // if (!title) {
    //   return await this.movieRepository.findAndCount({
    //     relations: ['director', 'genres'],
    //   });
    // }

    // return await this.movieRepository.findAndCount({
    //   where: {
    //     title: Like(`%${title}%`),
    //   },
    //   relations: ['director', 'genres'],
    // });

    return qd.getManyAndCount();
  }

  async findOne(id: number) {
    const movie = await this.movieRepository.createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')
      .leftJoinAndSelect('movie.detail', 'detail')
      .where('movie.id = :id', {id})
      .getOne();

    // const movie = await this.movieRepository.findOne({
    //   where: {
    //     id
    //   },
    //   relations: ['detail', 'director', 'genre'],
    // });

    if (!movie) {
      throw new NotFoundException('movie not found');
    }

    return movie;
  }

  async create(createMovieDto: CreateMovieDto) {
    const qr = this.dataSource.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();
    
    try {
      // validation
      const director = await qr.manager.findOne(Director, {
        where: {
          id: createMovieDto.directorId,
        },
      });

      if (!director) {
        throw new NotFoundException('director not found');
      }

      const genres = await qr.manager.find(Genre, {
        where: {
          id: In(createMovieDto.genreIds),
        },
      });

      if (genres.length !== createMovieDto.genreIds.length) {
        throw new NotFoundException(`genre not found find Ids :: ${genres.map(genre => genre.id).join(',')}`);
      }

      // save
      const movieDetail = await qr.manager.createQueryBuilder()
        .insert()
        .into(MovieDetail)
        .values({
          detail: createMovieDto.detail,
        })
        .execute();

      const movieDetailId = movieDetail.identifiers[0].id;

      const movie = await qr.manager.createQueryBuilder()
        .insert()
        .into(Movie)
        .values({
          title: createMovieDto.title,
          detail: {
            id: movieDetailId
          },
          director,
        })
        .execute();

      const movieId = movie.identifiers[0].id;

      await qr.manager.createQueryBuilder()
      .relation(Movie, 'genres')
      .of(movieId)
      .add(genres.map(genre => genre.id));

      // const movie = await this.movieRepository.save({
      //   title: createMovieDto.title,
      //   detail: {
      //     detail: createMovieDto.detail,
      //   },
      //   director,
      //   genres,
      // });

      await qr.commitTransaction();

      return await this.movieRepository.findOne({
        where: {
          id: movieId,
        }
      });
    } catch (e) {
      await qr.rollbackTransaction();

      throw e;
    } finally {
      await qr.release();
    }
    
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const qr = this.dataSource.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();

    try {
      // validation
      const movie = await qr.manager.findOne(Movie, {
        where: {
          id
        },
        relations: ['detail', 'genres'],
      });

      if (!movie) {
        throw new NotFoundException('movie not found');
      }

      const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

      let newDirector;

      if (directorId) {
        const director = await qr.manager.findOne(Director, {
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
        const genres = await qr.manager.find(Genre, {
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

      //update
      await qr.manager.createQueryBuilder()
        .update(Movie)
        .set(movieUpdateField)
        .where('id = :id', {id})
        .execute();

      // await this.movieRepository.update(
      //   { id },
      //   movieUpdateField,
      // );

      if (detail) {
        await qr.manager.createQueryBuilder()
          .update(MovieDetail)
          .set({
            detail: detail,
          })
          .where('id = :id', { id: movie.detail.id })
          .execute();
        

        // await this.movieDetailRepository.update(
        //   {
        //     id: movie.detail.id,
        //   },
        //   {
        //     detail: detail,
        //   }
        // )
      }

      if (newGenres) {
        await qr.manager.createQueryBuilder()
          .relation(Movie, 'genres')
          .of(id)
          .addAndRemove(newGenres.map(genre => genre.id), movie.genres.map(genre => genre.id));
      }

      const newMovie = await qr.manager.findOne(Movie, {
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

        await qr.manager.save(Movie, newMovie);

        const newMovie2 = await qr.manager.findOne(Movie, {
          where: {
            id
          },
          relations: ['detail', 'director', 'genres'],
        });

        await qr.commitTransaction();
        
        return newMovie2;
      }

      await qr.commitTransaction();

      return newMovie;
    } catch (e) {
      await qr.rollbackTransaction();

      throw e;
    } finally {
      await qr.release();
    }

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

    await this.movieRepository.createQueryBuilder()
      .delete()
      .where('id = :id', {id})
      .execute();

    // await this.movieRepository.delete(id);
    await this.movieDetailRepository.delete(movie.detail.id);

    return id;
  }

}
