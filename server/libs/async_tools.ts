export async function call_with_timeout<T>(
    asyncPromise: Promise<T>,
    timeLimit: number,
    default_value: T
): Promise<T> {
    let timeoutHandle;
    const timeoutPromise = new Promise<T>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => _resolve(default_value), timeLimit);
    });
    const result = await Promise.race([asyncPromise, timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
}
