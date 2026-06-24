/**
 * Timer Utilities for Performance Metrics
 * 
 * Provides high-resolution timing calculations using process.hrtime.bigint()
 * to capture execution metrics in milliseconds with 2 decimal precision.
 */

/**
 * Starts a high-resolution timer.
 * @returns {bigint} The start timestamp in nanoseconds.
 */
export function startTimer() {
  return process.hrtime.bigint();
}

/**
 * Calculates the elapsed time in milliseconds from a start timestamp.
 * @param {bigint} start - The start timestamp from startTimer().
 * @returns {number} The elapsed time in milliseconds with 2 decimal precision.
 */
export function stopTimer(start) {
  const end = process.hrtime.bigint();
  const durationNs = end - start;
  // Convert nanoseconds (BigInt) to milliseconds (Number)
  const durationMs = Number(durationNs) / 1_000_000;
  return Number(durationMs.toFixed(2));
}

/**
 * Measures the execution time of a synchronous or asynchronous function.
 * Ensures the timing is captured even if the function fails.
 * 
 * @template T
 * @param {() => Promise<T>|T} fn - The function to measure.
 * @returns {Promise<{result?: T, error?: any, durationMs: number}>}
 */
export async function measureTiming(fn) {
  const start = startTimer();
  try {
    const result = await fn();
    return { result, durationMs: stopTimer(start) };
  } catch (error) {
    const durationMs = stopTimer(start);
    return { error, durationMs };
  }
}
