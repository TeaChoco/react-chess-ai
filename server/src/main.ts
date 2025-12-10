import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: '*',
        credentials: true,
    });
    await app.listen(process.env.PORT ?? 3000);
    console.log(
        `Server running on http://localhost:${process.env.PORT ?? 3000}`,
    );
}
bootstrap();
