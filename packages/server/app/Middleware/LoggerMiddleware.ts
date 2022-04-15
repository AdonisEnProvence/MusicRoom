import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Logger from '@ioc:Adonis/Core/Logger';
import {
    REQUEST_HEADER_DEVICE_INFORMATION,
    REQUEST_HEADER_DEVICE_OS,
} from '@musicroom/types';
import { REQUEST_HEADER_APP_VERSION_KEY } from '@musicroom/types/src/http';

export default class LoggerMiddleware {
    public async handle(
        { request }: HttpContextContract,
        next: () => Promise<void>,
    ): Promise<void> {
        const appVersion = request.header(REQUEST_HEADER_APP_VERSION_KEY);
        const deviceOs = request.header(REQUEST_HEADER_DEVICE_OS);
        const deviceInformation = request.header(
            REQUEST_HEADER_DEVICE_INFORMATION,
        );

        const appVersionIsDefined = appVersion !== undefined;
        const deviceOsIsDefined = deviceOs !== undefined;
        const deviceInformationIsDefined = deviceInformation !== undefined;

        Logger.info(`
        ${
            deviceInformationIsDefined
                ? `DEVICE_INFORMATION: ${deviceInformation}`
                : ''
        }${deviceOsIsDefined ? `DEVICE_OS: ${deviceOs}` : ''}${
            appVersionIsDefined ? `DEVICE_INFORMATION: ${appVersion}` : ''
        }
        URL: ${request.url()}
        METHOD: ${request.method()}
        `);
        await next();
    }
}
