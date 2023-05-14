# Nestjs Mailer
Nestjs mailing service based on `nodemailer` with additional feature like
- Multi mailer/ driver, you can used multiple driver like mailtrap, SES together
- use your own view adapter like handlebars, nunjucks etc

## Installation

```bash
npm install --save @haorama/nestjs-mailer nodemailer
npm install --save-dev @types/nodemailer
#or
yarn add @haorama/nestjs-mailer nodemailer
yarn add -D @types/nodemailer
```

## Usage
Import the MailerModule into your Root Module e.g `AppModule`.

```typescript
import { Module } from "@nestjs/common";
import { MailerModule } from "@haorama/nestjs-mailer";

@Module({
  imports: [
    MailerModule.forRoot({
      mailers: {
        mailtrap: {
          host: process.env.MAIL_HOST,
          port: +process.env.MAIL_PORT,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
          },
        },
      },
      default_mailer: "mailtrap"
    })
  ]
})
export class AppModule {}
```
and somewhere in your service or controller you can use `MailerService` and send the email

```typescript
import { MailerService } from "@haorama/nestjs-mailer";

@Injectable()
export class AuthService {
  constructor(private mailerService: MailerService) {}

  sendOtp() {
    const otp = 123456;

    await this.mailerService.send({
      to: "user@example.com",
      subject: "OTP",
      text: `Your Otp is ${otp}`,
      html: `<p>Your Otp is ${otp}</p>`,
      data: {
        otp
      },
    });
  }
}
```
### Async Configuration

you can also use `forRootAsync` e.g if you prefer to put all configuration inside your config module file
```typescript
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return configService.get("mail");
      },
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
  ]
})
export class AppModule {}
```

### Amazon SES
you can pass a function and return the `Transport` instance from nodemailer
```typescript
// this import depend on your allowSyntheticDefaultImports on your tsconfig.json
import * as nodemailer from "nodemailer";
import * as aws from "@aws-sdk/client-ses";

const ses = new aws.SES({
  region: process.env.AWS_REGION,
  credentialDefaultProvider: defaultProvider,
});

@Module({
  imports: [
    MailerModule.forRoot({
      mailers: {
        ses: () => nodemailer.createTransport({ SES: { ses, aws } }),
        mailtrap: {
          host: process.env.MAIL_HOST,
          port: +process.env.MAIL_PORT,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
          },
        },
      },
      default_mailer: "ses",
    }),
  ]
})
export class AppModule {}
```

### Template / View Engine
We dont provide default template engine inside `MailerModule` but you can create and choose your own template / view engine.
For example we can create a Nunjuck engine by passing `template` inside module options.

First create a NunjuckAdapter class and extends our `MailEngineAdapter` to it
```typescript
import { resolve, join } from "path";
import nunjucks from "nunjucks";
import { MailEngineAdapter } from "@hikingness/nestjs-mailer";

export class NunjucksAdapter extends MailEngineAdapter {
  root: string;

  constructor() {
    super();
    this.root = resolve("./src/views/html");
  }

  render(path: string, data?: any) {
    const env = new nunjucks.Environment();

    const name = process.env.APP_NAME;
    nunjucks.configure(this.root, { autoescape: true });

    return nunjucks.render(join(this.root, path), {
      appName: name,
      ...data,
    });
  }
}
```
the `render` method can be anything as long as it return an html, then in the `MailerModule`

```typescript
@Module({
  imports: [
    MailerModule.forRoot({
      mailers: {
        mailtrap: {
          host: process.env.MAIL_HOST,
          port: +process.env.MAIL_PORT,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD,
          },
        },
      },
      default_mailer: "mailtrap",
      template: {
        engine: new NunjucksAdapter()
      }
    })
  ]
})
export class AppModule {}
```
After that you can use `template` options inside `send` method

```typescript
await this.mailerService.send({
  to: "user@example.com",
  subject: "OTP",
  // this path depend on your view configuration on the template / view adapter
  template: "/emails/otp.html",
  data: {
    otp,
  },
});
```

### Queueing
By default we dont provide queueing inside `MailerService`, but you can create your own mailing Module.

```typescript
import { MailerModule } from "@hikingness/nestjs-mailer";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
// we used bull for queueing the email
import { BullModule } from "@nestjs/bull";
import { MailService } from "./mail.service";
import { MailConsumer } from "./mail.consumer";

@Module({
  imports: [
    MailerModule.forRootAsync({
      mailers: {
        anyMailerOfYours: "defined your config here",
      }
    }),
    BullModule.registerQueue({
      name: "mail",
    }),
  ],
  providers: [MailService, MailConsumer],
  exports: [MailService],
})
export class MailModule {}
```
as you can see above we use `BullModule` from `@nestjs/bull` to make the mailing service queueable, we still need to define `MailService` and `MailConsumer`

mail.service.ts
```typescript
import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { SendMailOptions } from "@haorama/nestjs-mailer";

/**
 * This mail service by default send an email in the background using Bull queue
 */
@Injectable()
export class MailService {
  constructor(@InjectQueue("mail") private mailQueue: Queue) {}

  send(options: SendMailOptions) {
    return this.mailQueue.add("send", options);
  }
}
```
mail.consumer.ts
```typescript
import { MailerService, SendMailOptions } from "@haorama/nestjs-mailer";
import { OnQueueFailed, Process, Processor } from "@nestjs/bull";
import { Job } from "bull";

@Processor("mail")
export class MailConsumer {
  constructor(private mailerService: MailerService) {}

  @Process("send")
  send(job: Job<SendMailOptions>) {
    return this.mailerService.send(job.data);
  }

  @OnQueueFailed({ name: "send" })
  onSendFailed(job: string, error: any) {
    console.log("Job failed", job, error);
    // or send failed report to Sentry etc
  }
}

```

and you can replace the `MailerService` with your own service (in this example is `MailService`)

```typescript
import { MailService } from "/your-mail-service-path";

@Injectable()
export class AuthService {
  constructor(private mailService: MailService) {}

  sendOtp() {
    const otp = 123456;

    await this.mailService.send({
      to: "user@example.com",
      subject: "OTP",
      template: "/views/otp.html",
      data: {
        otp
      },
    });
  }
}
```
