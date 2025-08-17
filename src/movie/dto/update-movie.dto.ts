import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class UpdateMovieDto {
    @IsNotEmpty()
    @IsOptional()
    title?: string;

    @IsNotEmpty()
    @IsOptional()
    detail?: string;

    @IsNotEmpty()
    @IsOptional()
    directorId?: number;

    @IsArray()
    @ArrayNotEmpty()
    @IsNumber({}, {
        each: true,
    })
    @IsOptional()
    genreIds?: number[];
}