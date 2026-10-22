import { UniqueStore } from "./unique_store.ts"
import { TaskPool } from "./taskpool.ts"
import { safe } from "./safe.ts"
import { extractHrefs, isExternalUrl } from "./network.ts"

async function main(args: string[]): Promise<void> {
    if (args.length < 3) {
        throw new Error("Please provide a website url to continue.")
    }

    const baseURL = args[2]!
    const maxWorkers = 4

    const visited = new UniqueStore("./data/visited.txt")
    const completed = new UniqueStore("./data/completed.txt")
    const external = new UniqueStore("./data/external.txt")
    const pool = new TaskPool(maxWorkers)

    const processPage = async (pageURL: string) => {
        if (visited.has(pageURL)) return
        const hrefs = await extractHrefs(baseURL, pageURL)
        visited.add(pageURL)
        await completed.add(pageURL)

        for (const url of hrefs) {
            if (isExternalUrl(baseURL, url)) {
                await external.add(url)
                continue
            }

            pool.submit(() => safe(processPage(url)))
        }
    }

    pool.submit(() => safe(processPage(baseURL)))
    await pool.wait()
}

main(process.argv).catch(console.error)
