export async function fetchWithRetry(
    url: string,
    options: any,
    maxRetries: number = 5
): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        const attemptFetch = (retries: number): void => {
            fetch(url, options)
                .then((response: Response) => {
                    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
                    return response.json();
                })
                .then(data => resolve(data))
                .catch(error => {
                    if (retries > 0) {
                        console.log(`Fetch failed. Retrying (${maxRetries - retries + 1} of ${maxRetries})...`);
                        setTimeout(() => attemptFetch(retries - 1), 1000); // wait 1 second before retrying
                    } else {
                        reject(`Fetch failed after ${maxRetries} attempts: ${error.message}`);
                    }
                });
        }

        attemptFetch(maxRetries);
    });
}
