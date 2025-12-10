import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: '*',
        credentials: true,
    });
    await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? '0.0.0.0');
    console.log(`Server running on ${await app.getUrl()}`);
}
bootstrap();
