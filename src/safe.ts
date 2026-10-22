export async function safe<T>(p: Promise<T>): Promise<T | undefined> {
    try {
        return await p
    } catch (err) {
        if (err instanceof Error) {
            console.log(`ERROR: ${err.message}`)
        } else {
            console.log("ERROR: unknown error")
        }
        return
    }
}
