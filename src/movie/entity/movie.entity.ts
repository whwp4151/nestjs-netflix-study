import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseTable } from "./base-table.entity";
import { MovieDetail } from "./movie-detail.entity";

@Entity()
export class Movie extends BaseTable {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;
    
    @Column()
    genre: string;

    @OneToOne(
        () => MovieDetail,
        detail => detail.id,
        {
            cascade: true,
        }
    )
    @JoinColumn()
    detail: MovieDetail;

}