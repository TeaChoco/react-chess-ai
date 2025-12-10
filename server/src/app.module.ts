// Path: "server/src/app.module.ts"
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChessModule } from './chess/chess.module';

@Module({
    imports: [ChessModule],
    providers: [AppService],
    controllers: [AppController],
})
export class AppModule {}
