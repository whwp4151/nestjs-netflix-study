import { IsNotEmpty, IsOptional } from "class-validator";

export class UpdateGenreDto {

    @IsNotEmpty()
    @IsOptional()
    name?: string;

}
