// Function to execute with retries
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 5,
  delayMs = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Unreachable code");
}