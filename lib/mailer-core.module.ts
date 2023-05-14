import { DynamicModule, Global, Module, Provider, Type } from "@nestjs/common";
import { MAILER_MODULE_OPTIONS } from "./constants";
import {
  MailerModuleAsyncOptions,
  MailerModuleOptions,
  MailerOptionsFactory,
} from "./interfaces";
import { MailerService } from "./mailer.service";

@Global()
@Module({})
export class MailerCoreModule {
  static forRoot(options: MailerModuleOptions): DynamicModule {
    const mailerOptionsProvider: Provider = {
      provide: MAILER_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: MailerCoreModule,
      providers: [mailerOptionsProvider, MailerService],
      exports: [MailerService],
    };
  }

  static forRootAsync(options: MailerModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: MailerCoreModule,
      imports: options.imports,
      providers: [...asyncProviders, MailerService],
      exports: [MailerService],
    };
  }

  private static createAsyncProviders(
    options: MailerModuleAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<MailerOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: MailerModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: MAILER_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = [
      (options.useClass || options.useExisting) as Type<MailerOptionsFactory>,
    ];

    return {
      provide: MAILER_MODULE_OPTIONS,
      useFactory: async (optionsFactory: MailerOptionsFactory) =>
        await optionsFactory.createMailerOptions(),
      inject,
    };
  }
}
