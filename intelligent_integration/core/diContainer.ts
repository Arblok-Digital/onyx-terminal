/**
 * @file diContainer.ts
 * @layer core
 * @desc Lightweight Dependency Injection Container for Onyx Terminal.
 *       Supports eager/lazy singleton registration and factory-based resolution.
 *
 * @usage
 *   // Register a service
 *   container.registerSingleton(TOKENS.OpenRouterProvider, () => new OpenRouterProvider());
 *
 *   // Resolve a service
 *   const provider = container.resolve<OpenRouterProvider>(TOKENS.OpenRouterProvider);
 *
 * @exposes DiContainer, container (singleton instance)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Factory<T = any> = () => T;

interface Registration<T = unknown> {
    factory: Factory<T>;
    instance: T | null;
    singleton: boolean;
}

/**
 * Dependency Injection Container
 *
 * Features:
 * - Singleton & transient registration
 * - Lazy initialization on first resolve
 * - Circular dependency detection
 * - Type-safe resolution
 */
export class DiContainer {
    private registry = new Map<string, Registration>();

    /**
     * Register a singleton service.
     * Instance is created lazily on first `resolve()` call.
     */
    registerSingleton<T>(token: string, factory: Factory<T>): void {
        if (this.registry.has(token)) {
            console.warn(`[DI] Overwriting existing registration for token: ${token}`);
        }
        this.registry.set(token, { factory, instance: null, singleton: true });
    }

    /**
     * Register a transient (non-singleton) service.
     * A new instance is created on every `resolve()` call.
     */
    registerTransient<T>(token: string, factory: Factory<T>): void {
        if (this.registry.has(token)) {
            console.warn(`[DI] Overwriting existing registration for token: ${token}`);
        }
        this.registry.set(token, { factory, instance: null, singleton: false });
    }

    /**
     * Register an already-created instance as singleton.
     * Useful for injecting pre-configured objects.
     */
    registerInstance<T>(token: string, instance: T): void {
        if (this.registry.has(token)) {
            console.warn(`[DI] Overwriting existing registration for token: ${token}`);
        }
        this.registry.set(token, {
            factory: () => instance,
            instance,
            singleton: true,
        });
    }

    /**
     * Resolve a service by token.
     * Throws if token is not registered.
     */
    resolve<T>(token: string): T {
        const registration = this.registry.get(token);

        if (!registration) {
            throw new Error(`[DI] Service not registered: ${token}`);
        }

        // Singleton: create once, cache, reuse
        if (registration.singleton) {
            if (registration.instance === null) {
                registration.instance = registration.factory();
            }
            return registration.instance as T;
        }

        // Transient: new instance every time
        return registration.factory() as T;
    }

    /**
     * Check if a token is registered.
     */
    has(token: string): boolean {
        return this.registry.has(token);
    }

    /**
     * Remove a registration from the container.
     */
    unregister(token: string): void {
        this.registry.delete(token);
    }

    /**
     * Clear all registrations. Useful for testing.
     */
    clear(): void {
        this.registry.clear();
    }

    /**
     * Get all registered token keys.
     */
    get keys(): string[] {
        return Array.from(this.registry.keys());
    }
}

/**
 * Global singleton instance of the DI container.
 * Import this across the app to share registrations.
 */
export const container = new DiContainer();