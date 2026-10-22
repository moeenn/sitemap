import fs from "node:fs/promises"

export class UniqueStore {
    #records: Set<string>
    #filename: string

    constructor(filename: string) {
        this.#filename = filename
        this.#records = new Set()
    }

    async add(record: string) {
        if (!this.#records.has(record)) {
            await fs.appendFile(this.#filename, record + "\n")
        }
        this.#records.add(record)
    }

    has(record: string): boolean {
        return this.#records.has(record)
    }
}
