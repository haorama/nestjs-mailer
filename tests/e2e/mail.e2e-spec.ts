import { NestApplication } from "@nestjs/core"
import { TestingModule, Test } from "@nestjs/testing";
import { MailerModule, MailerService } from "../../lib";
import * as nodemailer from "nodemailer";

describe("Mail (e2e) forRoot", () => {
  let app: NestApplication;
  let testingModule: TestingModule;

  beforeAll(async () => {
    const account = await nodemailer.createTestAccount();
    testingModule = await Test.createTestingModule({
      imports: [
        MailerModule.forRoot({
          mailers: {
            smtp: {
              host: "smtp.ethereal.email",
              port: 587,
              secure: false,
              auth: {
                user: account.user,
                pass: account.pass,
              }
            }
          },
          default_mailer: "smtp"
        })
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
  });

  it("should send email", async () => {
    expect(0).toBe(0);
  }, 20000)
})
