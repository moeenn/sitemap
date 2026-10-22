type Task = () => unknown | Promise<unknown>
type ErrorHandler = (err: unknown) => void

export class TaskPool {
    readonly #maxWorkers: number
    readonly #onError: ErrorHandler
    readonly #queue: Task[] = []
    #idleWaiters: Array<() => void> = []
    #active = 0

    constructor(
        maxWorkers: number,
        onError: ErrorHandler = (err) => console.error("TaskPool: task failed", err),
    ) {
        if (!Number.isInteger(maxWorkers) || maxWorkers < 1) {
            throw new RangeError("maxWorkers must be a positive integer")
        }
        this.#maxWorkers = maxWorkers
        this.#onError = onError
    }

    /** Queues a task to run as soon as a slot is free. Returns nothing. */
    submit(task: Task): void {
        this.#queue.push(task)
        this.#drain()
    }

    /** Resolves when the queue is empty and no task is running. Safe to call repeatedly. */
    wait(): Promise<void> {
        if (this.#isIdle()) return Promise.resolve()
        return new Promise<void>((resolve) => this.#idleWaiters.push(resolve))
    }

    get pending(): number {
        return this.#queue.length
    }

    get active(): number {
        return this.#active
    }

    #isIdle(): boolean {
        return this.#active === 0 && this.#queue.length === 0
    }

    #drain(): void {
        // Only fill free slots, so maxWorkers can never be exceeded
        while (this.#active < this.#maxWorkers && this.#queue.length > 0) {
            const task = this.#queue.shift()! // FIFO
            this.#active++
            void this.#run(task) // #run never rejects
        }

        if (this.#isIdle()) {
            for (const resolve of this.#idleWaiters.splice(0)) resolve()
        }
    }

    async #run(task: Task): Promise<void> {
        try {
            await task() // inside async fn, so sync throws are caught too
        } catch (err) {
            try {
                this.#onError(err)
            } catch {
                // a faulty error handler must not leak the slot or reject
            }
        } finally {
            this.#active--
            this.#drain()
        }
    }
}
