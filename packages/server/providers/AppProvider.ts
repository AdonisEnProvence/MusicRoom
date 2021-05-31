import { ApplicationContract } from '@ioc:Adonis/Core/Application';

export default class AppProvider {
    constructor(protected app: ApplicationContract) {}

    public register(): void {
        // Register your own bindings
    }

    public async boot(): Promise<void> {
        // IoC container is ready
    }

    public async ready(): Promise<void> {
        if (this.app.environment === 'web') {
            await import('../start/socket');
        }
    }

    public async shutdown(): Promise<void> {
        // Cleanup, since app is going down
    }
}
